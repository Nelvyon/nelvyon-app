export type UserRole = "member" | "operator" | "admin" | "super_admin";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  /** Present when session comes from Nelvyon cookie auth (`/api/auth/me`). */
  tenantId?: string;
  fullName?: string;
}

export interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
}
