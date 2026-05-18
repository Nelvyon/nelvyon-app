"use client";

import { useEffect } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { useWorkspaceList } from "@/features/workspace/hooks";

/** Keeps UI `UserRole` aligned with membership role for the active `X-Workspace-Id`. */
export function useWorkspaceRoleSync() {
  const { user, accessToken, syncRoleFromWorkspaceRole } = useAuth();
  const { workspaceId } = useWorkspace();
  const list = useWorkspaceList(Boolean(user && accessToken));

  useEffect(() => {
    if (!list.data?.length || !workspaceId) return;
    const row = list.data.find((w) => String(w.id) === workspaceId);
    if (row?.role != null) {
      syncRoleFromWorkspaceRole(row.role);
    }
  }, [list.data, workspaceId, syncRoleFromWorkspaceRole]);
}
