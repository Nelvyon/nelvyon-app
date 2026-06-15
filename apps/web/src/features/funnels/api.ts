import { apiClient } from "@/core/api";

import type { Funnel, FunnelAnalytics, FunnelStep, UnifiedFunnelsReporting } from "@/features/funnels/types";

const BFF = "/api/platform/funnels";

export const funnelsApi = {
  list: () => apiClient.get<{ items: Funnel[] }>(BFF, { tenantScoped: true }),
  create: (body: {
    name: string;
    steps?: FunnelStep[];
    status?: string;
    metadata?: Record<string, unknown>;
  }) => apiClient.post<Funnel>(BFF, { tenantScoped: true, body }),
  get: (id: string) => apiClient.get<Funnel>(`${BFF}/${id}`, { tenantScoped: true }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<Funnel>(`${BFF}/${id}`, { tenantScoped: true, body }),
  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`${BFF}/${id}`, { tenantScoped: true }),
  analytics: (id: string) =>
    apiClient.get<FunnelAnalytics>(`${BFF}/${id}/analytics`, { tenantScoped: true }),
  unifiedReporting: () =>
    apiClient.get<UnifiedFunnelsReporting>(`${BFF}/reporting/unified`, { tenantScoped: true }),
};
