import type { UserRole } from "@/core/auth/types";
import type { WorkspaceRow } from "@/features/workspace/types";

/** Backend `/api/v1/auth/me` exposes platform `role` (user | admin | super_admin). */
export interface AuthMeResponse {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

/**
 * Maps workspace membership role (from `/api/v1/workspace/list`) to UI `UserRole`
 * for module gates. `owner` is treated as full workspace control → admin.
 */
export function workspaceRoleToUiRole(wsRole: string | null | undefined): UserRole {
  const r = (wsRole ?? "").toLowerCase();
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "operator") return "operator";
  if (r === "viewer" || r === "member") return "member";
  return "member";
}

/** When no workspace row is available yet, derive a conservative UI role from JWT platform role. */
export function jwtPlatformRoleToUiRole(platformRole: string): UserRole {
  const r = (platformRole ?? "").toLowerCase();
  if (r === "super_admin") return "super_admin";
  if (r === "admin") return "admin";
  return "member";
}

export function resolveUiRole(me: AuthMeResponse, activeWorkspace: WorkspaceRow | null): UserRole {
  if (activeWorkspace?.role) {
    return workspaceRoleToUiRole(activeWorkspace.role);
  }
  return jwtPlatformRoleToUiRole(me.role);
}
