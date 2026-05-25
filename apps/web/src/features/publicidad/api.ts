import { apiClient } from "@/core/api";

export type AdsBriefingPayload = {
  product: string;
  audience: string;
  goal: string;
  daily_budget_eur: number;
  creative_image_url?: string | null;
  notes?: string;
  launch: boolean;
};

export const publicidadApi = {
  googleStatus: () =>
    apiClient.get<{ mock: boolean; oauth_configured: boolean }>("/api/google-ads/status", { tenantScoped: true }),
  googleCampaigns: () =>
    apiClient.get<{ campaigns: unknown[]; mock: boolean }>("/api/google-ads/campaigns", { tenantScoped: true }),
  googleReporting: () =>
    apiClient.get<{ summary: Record<string, number>; campaigns: unknown[] }>("/api/google-ads/reporting", {
      tenantScoped: true,
    }),
  metaStatus: () => apiClient.get<{ mock: boolean }>("/api/meta-ads/status", { tenantScoped: true }),
  metaCampaigns: () =>
    apiClient.get<{ campaigns: unknown[]; mock: boolean }>("/api/meta-ads/campaigns", { tenantScoped: true }),
  metaReporting: () =>
    apiClient.get<{ summary: Record<string, number>; campaigns: unknown[] }>("/api/meta-ads/reporting", {
      tenantScoped: true,
    }),
  unifiedReporting: () =>
    apiClient.get<{
      google: { summary: Record<string, number>; campaigns: unknown[] };
      meta: { summary: Record<string, number>; campaigns: unknown[] };
      unified: { total_spend: number; blended_roas: number };
    }>("/api/ads-agent/reporting/unified", { tenantScoped: true }),
  runBriefing: (body: AdsBriefingPayload) =>
    apiClient.post<{
      run_id: string;
      strategy: Record<string, unknown>;
      launched: boolean;
      google?: unknown;
      meta?: unknown;
    }>("/api/ads-agent/briefing", { tenantScoped: true, body }),
  roasAlerts: (threshold = 1.5) =>
    apiClient.get<{ alerts: Array<{ platform: string; message: string; severity: string }> }>(
      `/api/ads-agent/alerts/roas?threshold=${threshold}`,
      { tenantScoped: true },
    ),
  optimize: (threshold = 1.5) =>
    apiClient.post<{ actions: unknown[] }>(`/api/ads-agent/optimize?roas_threshold=${threshold}`, {
      tenantScoped: true,
      body: {},
    }),
};
