"use client";

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  fetchAuthMe,
  fetchNelvyonAuthMe,
  fetchNelvyonTokenFromCookie,
  fetchWorkspaceList,
} from "@/core/auth/authApi";
import { ensureWorkspaceForToken } from "@/core/auth/ensureWorkspace";
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
  isBootstrapping: boolean;
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

function persistJwt(token: string): void {
  try {
    sessionStorage.setItem(JWT_SESSION_KEY, token);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const syncRoleFromWorkspaceRole = useCallback((workspaceRole: string | null) => {
    setUser((prev) => (prev ? { ...prev, role: workspaceRoleToUiRole(workspaceRole) } : prev));
  }, []);

  const applySession = useCallback(
    (nextUser: SessionUser, token: string) => {
      persistJwt(token);
      setUser(nextUser);
      setAccessToken(token);
      setAccessTokenProvider(() => token);
    },
    [],
  );

  const signIn = useCallback(
    (nextUser: SessionUser, token: string) => {
      applySession(nextUser, token);
      void ensureWorkspaceForToken(token, syncRoleFromWorkspaceRole).catch(() => {
        /* workspace bootstrap is best-effort on sign-in */
      });
    },
    [applySession, syncRoleFromWorkspaceRole],
  );

  const signOut = useCallback(() => {
    void (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      } catch {
        /* ignore */
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapNelvyonJwt(storedJwt: string): Promise<boolean> {
      try {
        const me = await fetchNelvyonAuthMe(storedJwt);
        if (cancelled) return true;
        applySession(
          {
            id: me.userId,
            email: me.email,
            role: nelvyonPlanToUiRole(me.plan),
            tenantId: me.tenantId,
            fullName: me.fullName,
          },
          storedJwt,
        );
        await ensureWorkspaceForToken(storedJwt, syncRoleFromWorkspaceRole);
        return true;
      } catch {
        return false;
      }
    }

    async function bootstrapLegacyStagingJwt(storedJwt: string): Promise<boolean> {
      try {
        const me = await fetchAuthMe(storedJwt);
        const workspaces = await fetchWorkspaceList(storedJwt);
        if (cancelled) return true;

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
        applySession({ id: me.id, email: me.email, role }, storedJwt);
        if (activeRow) {
          syncRoleFromWorkspaceRole(activeRow.role ?? null);
        }
        return true;
      } catch {
        return false;
      }
    }

    async function bootstrapFromCookie(): Promise<boolean> {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (cancelled || !r.ok) return false;
        const me: unknown = await r.json();
        if (!me || typeof me !== "object") return false;
        const o = me as Record<string, unknown>;
        if (
          typeof o.userId !== "string" ||
          typeof o.email !== "string" ||
          typeof o.tenantId !== "string" ||
          typeof o.plan !== "string" ||
          typeof o.fullName !== "string"
        ) {
          return false;
        }

        const tokenFromCookie = await fetchNelvyonTokenFromCookie();
        if (!tokenFromCookie) return false;

        applySession(
          {
            id: o.userId,
            email: o.email,
            role: nelvyonPlanToUiRole(o.plan),
            tenantId: o.tenantId,
            fullName: o.fullName,
          },
          tokenFromCookie,
        );
        await ensureWorkspaceForToken(tokenFromCookie, syncRoleFromWorkspaceRole);
        return true;
      } catch {
        return false;
      }
    }

    async function run() {
      setIsBootstrapping(true);
      const storedJwt = readStoredJwt();
      let ok = false;

      if (storedJwt) {
        ok = await bootstrapNelvyonJwt(storedJwt);
        if (!ok) {
          ok = await bootstrapLegacyStagingJwt(storedJwt);
        }
        if (!ok) {
          try {
            sessionStorage.removeItem(JWT_SESSION_KEY);
          } catch {
            /* ignore */
          }
        }
      }

      if (!ok) {
        ok = await bootstrapFromCookie();
      }

      if (!cancelled) {
        setIsBootstrapping(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [applySession, syncRoleFromWorkspaceRole]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isBootstrapping,
      signIn,
      signOut,
      syncRoleFromWorkspaceRole,
    }),
    [accessToken, isBootstrapping, signIn, signOut, syncRoleFromWorkspaceRole, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
