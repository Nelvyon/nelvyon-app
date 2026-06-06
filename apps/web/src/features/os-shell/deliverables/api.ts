import { apiClient } from "@/core/api";
import type {
  OsDeliverable,
  OsDeliverableCreateInput,
  OsDeliverableListResponse,
  OsDeliverableUpdateInput,
  OsDeliverableVersionListResponse,
} from "@/features/os-shell/deliverables/types";

const BASE = "/api/v1/os/deliverables";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const osDeliverablesApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
    visibility?: string;
    type?: string;
    client_id?: string;
    project_id?: string;
    task_id?: string;
  }) =>
    apiClient.get<OsDeliverableListResponse>(`${BASE}${qs(params ?? {})}`, { tenantScoped: true }),

  getById: (id: string) => apiClient.get<OsDeliverable>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsDeliverableCreateInput) =>
    apiClient.post<OsDeliverable, OsDeliverableCreateInput>(BASE, { body, tenantScoped: true }),

  update: (id: string, body: OsDeliverableUpdateInput) =>
    apiClient.patch<OsDeliverable, OsDeliverableUpdateInput>(`${BASE}/${id}`, {
      body,
      tenantScoped: true,
    }),

  archive: (id: string) => apiClient.delete<{ message: string; id: string; status: string }>(`${BASE}/${id}`, { tenantScoped: true }),

  submitReview: (id: string) =>
    apiClient.post<OsDeliverable>(`${BASE}/${id}/submit-review`, { tenantScoped: true }),

  deliver: (id: string) => apiClient.post<OsDeliverable>(`${BASE}/${id}/deliver`, { tenantScoped: true }),

  approve: (id: string) => apiClient.post<OsDeliverable>(`${BASE}/${id}/approve`, { tenantScoped: true }),

  publish: (id: string) => apiClient.post<OsDeliverable>(`${BASE}/${id}/publish`, { tenantScoped: true }),

  reject: (id: string, review_notes?: string) =>
    apiClient.post<OsDeliverable, { review_notes?: string }>(`${BASE}/${id}/reject`, {
      body: review_notes ? { review_notes } : {},
      tenantScoped: true,
    }),

  createRevision: (id: string) =>
    apiClient.post<OsDeliverable>(`${BASE}/${id}/create-revision`, { tenantScoped: true }),

  listVersions: (id: string) =>
    apiClient.get<OsDeliverableVersionListResponse>(`${BASE}/${id}/versions`, { tenantScoped: true }),

  listClientReviews: (id: string) =>
    apiClient.get<{ items: unknown[]; total: number }>(`${BASE}/${id}/client-reviews`, {
      tenantScoped: true,
    }),
};
