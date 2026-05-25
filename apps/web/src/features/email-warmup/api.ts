import { apiClient } from "@/core/api";

export const emailWarmupApi = {
  start: (email: string, domain?: string) =>
    apiClient.post<Record<string, unknown>>("/api/email-warmup/start", {
      tenantScoped: true,
      body: { email, domain },
    }),
  stats: (accountId?: string) =>
    apiClient.get<{ accounts: unknown[] }>(
      `/api/email-warmup/stats${accountId ? `?account_id=${accountId}` : ""}`,
      { tenantScoped: true },
    ),
  rotate: () =>
    apiClient.post<Record<string, unknown>>("/api/email-warmup/rotate", {
      tenantScoped: true,
      body: {},
    }),
  checkDeliverability: (payload: { subject: string; body: string; sender: string; domain?: string }) =>
    apiClient.post<Record<string, unknown>>("/api/email-warmup/check-deliverability", {
      tenantScoped: true,
      body: payload,
    }),
};
