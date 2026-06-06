"use client";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setAccessTokenProvider } from "@/core/api";
import { portalApi } from "@/features/client_portal_v1/api";
import { clearPortalJwt, readPortalJwt, writePortalJwt } from "@/features/client_portal_v1/portalSession";
import type { PortalAuthResponse, PortalUser } from "@/features/client_portal_v1/types";

interface PortalAuthContextValue {
  user: PortalUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (response: PortalAuthResponse) => void;
  signOut: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((token: string, nextUser: PortalUser) => {
    writePortalJwt(token);
    setAccessTokenProvider(() => token);
    setAccessToken(token);
    setUser(nextUser);
  }, []);

  const signIn = useCallback(
    (response: PortalAuthResponse) => {
      applySession(response.access_token, response.user);
    },
    [applySession],
  );

  const signOut = useCallback(() => {
    clearPortalJwt();
    setAccessTokenProvider(() => null);
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = readPortalJwt();
      if (!stored) {
        setIsLoading(false);
        return;
      }
      setAccessTokenProvider(() => stored);
      try {
        const me = await portalApi.me();
        if (cancelled) return;
        setAccessToken(stored);
        setUser(me);
      } catch {
        if (cancelled) return;
        clearPortalJwt();
        setAccessTokenProvider(() => null);
        setAccessToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<PortalAuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      signIn,
      signOut,
    }),
    [accessToken, isLoading, signIn, signOut, user],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used inside PortalAuthProvider");
  return ctx;
}
