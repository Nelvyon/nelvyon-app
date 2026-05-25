import { apiClient } from "@/core/api";

export const intentDataApi = {
  track: (body: {
    lead_id: string;
    event_type: string;
    page?: string;
    metadata?: Record<string, unknown>;
    lead_name?: string;
    company?: string;
  }) => apiClient.post("/api/intent/track", { tenantScoped: true, body }),
  score: (leadId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/intent/score/${leadId}`, { tenantScoped: true }),
  hotLeads: (minScore = 70) =>
    apiClient.get<{ leads: unknown[] }>(`/api/intent/hot-leads?min_score=${minScore}`, {
      tenantScoped: true,
    }),
  distribution: () =>
    apiClient.get<{ distribution: Record<string, number> }>("/api/intent/distribution", {
      tenantScoped: true,
    }),
  triggerSequence: (leadId: string) =>
    apiClient.post(`/api/intent/trigger-sequence/${leadId}`, { tenantScoped: true, body: {} }),
  getAlerts: () =>
    apiClient.get<{ alerts_enabled: boolean }>("/api/intent/settings/alerts", { tenantScoped: true }),
  setAlerts: (enabled: boolean) =>
    apiClient.put("/api/intent/settings/alerts", { tenantScoped: true, body: { alerts_enabled: enabled } }),
};
