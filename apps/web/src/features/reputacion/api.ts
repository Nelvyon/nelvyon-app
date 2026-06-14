import { apiClient } from "@/core/api";

import type { UnifiedReputacionReporting } from "@/features/reputacion/types";

const BFF = "/api/platform/reputacion";

export const reputacionApi = {
  listReviews: (params?: { sentiment?: string; platform?: string }) => {
    const q = new URLSearchParams();
    if (params?.sentiment) q.set("sentiment", params.sentiment);
    if (params?.platform) q.set("platform", params.platform);
    const qs = q.toString();
    return apiClient.get<{ items: UnifiedReputacionReporting["reviews"]["items"]; mock?: boolean }>(
      `${BFF}/reviews${qs ? `?${qs}` : ""}`,
      { tenantScoped: true },
    );
  },
  connection: () => apiClient.get<UnifiedReputacionReporting["connection"]>(`${BFF}/connection`, { tenantScoped: true }),
  alerts: () => apiClient.get<UnifiedReputacionReporting["alerts"]>(`${BFF}/alerts`, { tenantScoped: true }),
  embed: () => apiClient.get<{ widget_id: string; embed_html: string; script_url: string }>(`${BFF}/embed`, { tenantScoped: true }),
  connectGoogle: () => apiClient.post(`${BFF}/connection/google`, { tenantScoped: true, body: {} }),
  unifiedReporting: () => apiClient.get<UnifiedReputacionReporting>(`${BFF}/reporting/unified`, { tenantScoped: true }),
};
