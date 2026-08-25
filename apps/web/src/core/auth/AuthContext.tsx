"use client";

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  /**
   * Recupera la sesion desde la cookie, a peticion de quien sepa que la
   * necesita. Devuelve si lo consiguio.
   *
   * Existe porque el arranque automatico solo intentaba la cookie en una lista
   * de rutas escrita a mano (`/saas`, `/os`, `/portal`, `/admin`, `/dashboard`,
   * `/auth`, `/login`), y esa lista se habia quedado corta frente a las **136
   * pantallas** que envuelve `ProtectedLayout`: `/account`, `/analytics/*`,
   * `/campaigns`, `/billing`, `/crm/*`, `/funnels`, `/publicidad`,
   * `/reputacion`, `/social`, `/inbox`, `/ecommerce`, `/settings`,
   * `/automations/*`, `/app/*`...
   *
   * El JWT vive en `sessionStorage`, que es **por pestana**. Consecuencia
   * medida en navegador: abrir cualquiera de esas pantallas en una pestana
   * nueva —o volver a ellas tras reiniciar el navegador, o desde un enlace de
   * un correo— echaba al usuario al login con la sesion perfectamente valida en
   * la cookie, mientras que `/saas/dashboard` entraba sin problema. Mismo
   * usuario, misma cookie, dos comportamientos.
   *
   * Una lista de rutas mantenida a mano se desincroniza siempre. Que lo pida
   * quien lo necesita elimina la lista como fuente de verdad.
   */
  recuperarSesionDesdeCookie: () => Promise<boolean>;
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
  // `cancelled` era del ambito del efecto; al sacar la recuperacion fuera
  // hace falta una senal que viva con el componente.
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

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

  /** Ver `recuperarSesionDesdeCookie` en el contrato: se invoca a demanda. */
  const recuperarSesionDesdeCookie = useCallback(async (): Promise<boolean> => {

    try {
      const r = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      if (!vivo.current || !r.ok) return false;
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
  }, [applySession, syncRoleFromWorkspaceRole]);

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
        const path = typeof window !== "undefined" ? window.location.pathname : "";
        const isAppSurface =
          path.startsWith("/saas") ||
          path.startsWith("/os") ||
          path.startsWith("/portal") ||
          path.startsWith("/admin") ||
          path.startsWith("/dashboard") ||
          path.startsWith("/login") ||
          path.startsWith("/auth");
        // Avoid noisy 401 /api/auth/me on anonymous public marketing pages.
        if (isAppSurface) {
          ok = await recuperarSesionDesdeCookie();
        }
      }

      if (!cancelled) {
        setIsBootstrapping(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [applySession, recuperarSesionDesdeCookie, syncRoleFromWorkspaceRole]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isBootstrapping,
      signIn,
      signOut,
      recuperarSesionDesdeCookie,
      syncRoleFromWorkspaceRole,
    }),
    [accessToken, isBootstrapping, recuperarSesionDesdeCookie, signIn, signOut, syncRoleFromWorkspaceRole, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
