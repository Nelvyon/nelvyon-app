import { apiClient } from "@/core/api";

const BASE = "/api/v1/portal";

export interface PortalInviteCreateResult {
  invite_id: string;
  email: string;
  client_id: string;
  expires_at: string;
  token: string;
}

export interface PortalInviteListItem {
  id: string;
  email: string;
  client_id: string;
  status: "pending" | "accepted" | "expired" | string;
  expires_at?: string | null;
  accepted_at?: string | null;
  created_at?: string | null;
}

export interface PortalInviteListResponse {
  items: PortalInviteListItem[];
  total: number;
}

export const osPortalApi = {
  createInvite: (body: { client_id: string; email: string }) =>
    apiClient.post<PortalInviteCreateResult, typeof body>(`${BASE}/invites`, {
      body,
      tenantScoped: true,
    }),

  listInvites: (clientId: string) =>
    apiClient.get<PortalInviteListResponse>(
      `${BASE}/invites?client_id=${encodeURIComponent(clientId)}`,
      { tenantScoped: true },
    ),
};

export function buildPortalInviteUrl(token: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "") ??
    "";
  return `${base.replace(/\/$/, "")}/client/accept-invite?token=${encodeURIComponent(token)}`;
}
