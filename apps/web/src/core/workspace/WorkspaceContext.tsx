"use client";

import React from "react";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { WORKSPACE_ID_STORAGE_KEY } from "@/core/auth/sessionStorageKeys";
import { setWorkspaceIdProvider } from "@/core/api";

interface WorkspaceContextValue {
  workspaceId: string | null;
  setWorkspaceId: (workspaceId: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken } = useAuth();
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaceIdState(null);
      setWorkspaceIdProvider(() => null);
      return;
    }
    try {
      const p = localStorage.getItem(WORKSPACE_ID_STORAGE_KEY);
      if (p) {
        setWorkspaceIdState(p);
        setWorkspaceIdProvider(() => p);
      }
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, accessToken]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaceId,
      setWorkspaceId: (next) => {
        setWorkspaceIdState(next);
        setWorkspaceIdProvider(() => next);
        try {
          if (next) {
            localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, next);
          } else {
            localStorage.removeItem(WORKSPACE_ID_STORAGE_KEY);
          }
        } catch {
          /* ignore */
        }
      },
    }),
    [workspaceId],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
