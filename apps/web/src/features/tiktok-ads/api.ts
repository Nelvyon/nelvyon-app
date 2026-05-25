import { apiClient } from "@/core/api";

export const tiktokAdsApi = {
  status: () => apiClient.get<{ mock: boolean }>("/api/tiktok-ads/status", { tenantScoped: true }),
  campaigns: () =>
    apiClient.get<{ campaigns: unknown[]; mock: boolean }>("/api/tiktok-ads/campaigns", { tenantScoped: true }),
  metrics: () => apiClient.get<Record<string, number>>("/api/tiktok-ads/metrics", { tenantScoped: true }),
  create: (body: {
    name: string;
    daily_budget_eur?: number;
    hook?: string;
    primary_text?: string;
  }) =>
    apiClient.post("/api/tiktok-ads/campaigns", { tenantScoped: true, body }),
  suggest: (body: { product?: string; audience?: string; goal?: string }) =>
    apiClient.post<Record<string, string>>("/api/tiktok-ads/suggest", { tenantScoped: true, body }),
};
