"use client";

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchAuthMe, fetchWorkspaceList } from "@/core/auth/authApi";
import { resolveUiRole, workspaceRoleToUiRole } from "@/core/auth/mapSession";
import { nelvyonPlanToUiRole } from "@/core/auth/nelvyonPlanRole";
import { JWT_SESSION_KEY, WORKSPACE_ID_STORAGE_KEY } from "@/core/auth/sessionStorageKeys";
import { resetUser } from "@/lib/analytics";
import { setAccessTokenProvider } from "@/core/api";
import { SessionState, SessionUser } from "@/core/auth/types";

interface AuthContextValue extends SessionState {
  signIn: (user: SessionUser, accessToken: string) => void;
  signOut: () => void;
  isAuthenticated: boolean;
  /** After workspace list loads, align module gates with membership role. */
  syncRoleFromWorkspaceRole: (workspaceRole: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredJwt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(JWT_SESSION_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const syncRoleFromWorkspaceRole = useCallback((workspaceRole: string | null) => {
    setUser((prev) => (prev ? { ...prev, role: workspaceRoleToUiRole(workspaceRole) } : prev));
  }, []);

  const signIn = useCallback((nextUser: SessionUser, token: string) => {
    try {
      sessionStorage.setItem(JWT_SESSION_KEY, token);
    } catch {
      /* ignore */
    }
    setUser(nextUser);
    setAccessToken(token);
    setAccessTokenProvider(() => token);
  }, []);

  const signOut = useCallback(() => {
    void (async () => {
      if (accessToken?.startsWith("nelvyon:")) {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        } catch {
          /* ignore */
        }
      }
      try {
        sessionStorage.removeItem(JWT_SESSION_KEY);
      } catch {
        /* ignore */
      }
      try {
        localStorage.removeItem(WORKSPACE_ID_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      resetUser();
      setUser(null);
      setAccessToken(null);
      setAccessTokenProvider(() => null);
    })();
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapNelvyonFromCookie(): Promise<void> {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (cancelled || !r.ok) return;
        const me: unknown = await r.json();
        if (!me || typeof me !== "object") return;
        const o = me as Record<string, unknown>;
        if (
          typeof o.userId !== "string" ||
          typeof o.email !== "string" ||
          typeof o.tenantId !== "string" ||
          typeof o.plan !== "string" ||
          typeof o.fullName !== "string"
        ) {
          return;
        }
        setUser({
          id: o.userId,
          email: o.email,
          role: nelvyonPlanToUiRole(o.plan),
          tenantId: o.tenantId,
          fullName: o.fullName,
        });
        setAccessToken("nelvyon:httpOnly");
        setAccessTokenProvider(() => null);
      } catch {
        /* ignore */
      }
    }

    async function run() {
      const legacy = readStoredJwt();
      if (legacy) {
        try {
          const me = await fetchAuthMe(legacy);
          const workspaces = await fetchWorkspaceList(legacy);
          if (cancelled) return;

          const persisted = (() => {
            try {
              return localStorage.getItem(WORKSPACE_ID_STORAGE_KEY);
            } catch {
              return null;
            }
          })();

          const activeRow =
            (persisted ? workspaces.find((w) => String(w.id) === persisted) : undefined) ?? workspaces[0] ?? null;

          if (activeRow) {
            try {
              localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, String(activeRow.id));
            } catch {
              /* ignore */
            }
          }

          const role = resolveUiRole(me, activeRow);
          setUser({ id: me.id, email: me.email, role });
          setAccessToken(legacy);
          setAccessTokenProvider(() => legacy);
          return;
        } catch {
          if (cancelled) return;
          try {
            sessionStorage.removeItem(JWT_SESSION_KEY);
          } catch {
            /* ignore */
          }
          setAccessTokenProvider(() => null);
        }
      }

      await bootstrapNelvyonFromCookie();
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      signIn,
      signOut,
      syncRoleFromWorkspaceRole,
    }),
    [accessToken, signIn, signOut, syncRoleFromWorkspaceRole, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
