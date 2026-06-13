import { fetchPlatformWorkspaces } from "@/core/auth/authApi";
import { workspaceRoleToUiRole } from "@/core/auth/mapSession";
import { WORKSPACE_ID_STORAGE_KEY } from "@/core/auth/sessionStorageKeys";
import { setWorkspaceIdProvider } from "@/core/api";
import type { SessionUser } from "@/core/auth/types";

/** Load workspace list and persist X-Workspace-Id for tenant-scoped API calls. Best-effort — never blocks auth. */
export async function ensureWorkspaceForToken(
  accessToken: string,
  syncRoleFromWorkspaceRole: (role: string | null) => void,
): Promise<void> {
  try {
    const workspaces = await fetchPlatformWorkspaces(accessToken);
    const persisted = (() => {
      try {
        return localStorage.getItem(WORKSPACE_ID_STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    const activeRow =
      (persisted ? workspaces.find((w) => String(w.id) === persisted) : undefined) ?? workspaces[0] ?? null;
    if (!activeRow) return;

    const id = String(activeRow.id);
    try {
      localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setWorkspaceIdProvider(() => id);
    syncRoleFromWorkspaceRole(activeRow.role ?? null);
  } catch {
    /* workspace list may be temporarily unavailable (staging API); auth still valid */
  }
}

export function mergeUserWithWorkspaceRole(user: SessionUser, workspaceRole: string | null): SessionUser {
  return { ...user, role: workspaceRoleToUiRole(workspaceRole) };
}
