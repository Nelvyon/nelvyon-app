import { apiClient } from "@/core/api";

export const snapchatAdsApi = {
  status: () =>
    apiClient.get<{ mock: boolean; ad_account_id?: string }>("/api/snapchat-ads/status", {
      tenantScoped: true,
    }),
  campaigns: () =>
    apiClient.get<{ campaigns: unknown[]; mock: boolean }>("/api/snapchat-ads/campaigns", {
      tenantScoped: true,
    }),
  metrics: () =>
    apiClient.get<Record<string, number | boolean>>("/api/snapchat-ads/metrics", { tenantScoped: true }),
  create: (body: {
    name: string;
    objective?: string;
    daily_budget_eur?: number;
    headline?: string;
    visual_description?: string;
  }) => apiClient.post("/api/snapchat-ads/campaigns", { tenantScoped: true, body }),
  suggest: (body: { product?: string; audience?: string; goal?: string }) =>
    apiClient.post<Record<string, string>>("/api/snapchat-ads/suggest", { tenantScoped: true, body }),
};
