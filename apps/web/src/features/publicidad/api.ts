import { apiClient } from "@/core/api";

import type { AdsBriefingPayload, AdsRoasAlert, UnifiedReporting } from "@/features/publicidad/types";

const BFF = "/api/platform/ads";

export const publicidadApi = {
  googleStatus: () =>
    apiClient.get<{ mock: boolean; oauth_configured: boolean; customer_id?: string }>(
      `${BFF}/google/status`,
      { tenantScoped: true },
    ),
  googleCampaigns: () =>
    apiClient.get<{ campaigns: unknown[]; mock: boolean }>(`${BFF}/google/campaigns`, {
      tenantScoped: true,
    }),
  googleReporting: () =>
    apiClient.get<{ summary: Record<string, number>; campaigns: unknown[]; mock?: boolean }>(
      `${BFF}/google/reporting`,
      { tenantScoped: true },
    ),
  metaStatus: () => apiClient.get<{ mock: boolean }>(`${BFF}/meta/status`, { tenantScoped: true }),
  metaCampaigns: () =>
    apiClient.get<{ campaigns: unknown[]; mock: boolean }>(`${BFF}/meta/campaigns`, {
      tenantScoped: true,
    }),
  metaReporting: () =>
    apiClient.get<{ summary: Record<string, number>; campaigns: unknown[]; mock?: boolean }>(
      `${BFF}/meta/reporting`,
      { tenantScoped: true },
    ),
  unifiedReporting: () =>
    apiClient.get<UnifiedReporting>(`${BFF}/reporting/unified`, { tenantScoped: true }),
  runBriefing: (body: AdsBriefingPayload) =>
    apiClient.post<{
      run_id: string;
      strategy: Record<string, unknown>;
      launched: boolean;
      google?: unknown;
      meta?: unknown;
    }>(`${BFF}/briefing`, { tenantScoped: true, body }),
  roasAlerts: (threshold = 1.5) =>
    apiClient.get<{ alerts: AdsRoasAlert[]; threshold?: number }>(
      `${BFF}/alerts/roas?threshold=${threshold}`,
      { tenantScoped: true },
    ),
};
