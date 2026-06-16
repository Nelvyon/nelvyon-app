import { apiClient } from "@/core/api";
import type {
  PortalAcceptInviteInput,
  PortalAuthResponse,
  PortalDeliverable,
  PortalDeliverableReviewResponse,
  PortalListResponse,
  PortalLoginInput,
  PortalProject,
  PortalUser,
} from "@/features/client_portal_v1/types";

const AUTH_BASE = "/api/platform/portal/auth";
const BASE = "/api/platform/portal";

const portalOpts = { tenantScoped: false as const };

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const portalApi = {
  login: (body: PortalLoginInput) =>
    apiClient.post<PortalAuthResponse, PortalLoginInput>(`${AUTH_BASE}/login`, {
      body,
      tenantScoped: false,
    }),

  acceptInvite: (body: PortalAcceptInviteInput) =>
    apiClient.post<PortalAuthResponse, PortalAcceptInviteInput>(`${AUTH_BASE}/accept-invite`, {
      body,
      tenantScoped: false,
    }),

  me: () => apiClient.get<PortalUser>(`${BASE}/me`, portalOpts),

  listProjects: (params?: { page?: number; page_size?: number; q?: string }) =>
    apiClient.get<PortalListResponse<PortalProject>>(`${BASE}/projects${qs(params ?? {})}`, portalOpts),

  getProject: (id: string) => apiClient.get<PortalProject>(`${BASE}/projects/${id}`, portalOpts),

  listDeliverables: (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    project_id?: string;
  }) =>
    apiClient.get<PortalListResponse<PortalDeliverable>>(
      `${BASE}/deliverables${qs(params ?? {})}`,
      portalOpts,
    ),

  getDeliverable: (id: string) =>
    apiClient.get<PortalDeliverable>(`${BASE}/deliverables/${id}`, portalOpts),

  approveDeliverable: (id: string, feedback?: string) =>
    apiClient.post<PortalDeliverableReviewResponse, { feedback?: string }>(
      `${BASE}/deliverables/${id}/approve`,
      { body: feedback ? { feedback } : {}, tenantScoped: false },
    ),

  rejectDeliverable: (id: string, feedback: string) =>
    apiClient.post<PortalDeliverableReviewResponse, { feedback: string }>(
      `${BASE}/deliverables/${id}/reject`,
      { body: { feedback }, tenantScoped: false },
    ),
};
