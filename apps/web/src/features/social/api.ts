import { apiClient } from "@/core/api";

import type { SocialModuleAnalytics, SocialMonitoringDashboard, UnifiedSocialReporting } from "@/features/social/types";

const BFF = "/api/platform/social";

export const socialApi = {
  unifiedReporting: () =>
    apiClient.get<UnifiedSocialReporting>(`${BFF}/reporting/unified`, { tenantScoped: true }),
  monitoringDashboard: (refresh = false) =>
    apiClient.get<SocialMonitoringDashboard>(
      `${BFF}/monitoring/dashboard${refresh ? "?refresh=true" : ""}`,
      { tenantScoped: true },
    ),
  schedulerOverview: () =>
    apiClient.get<UnifiedSocialReporting["scheduler"]>(`${BFF}/scheduler/overview`, {
      tenantScoped: true,
    }),
  publishAnalytics: (clientId = "ws-client-1") =>
    apiClient.get<UnifiedSocialReporting["auto_publish"]>(
      `${BFF}/publish/analytics?client_id=${encodeURIComponent(clientId)}`,
      { tenantScoped: true },
    ),
  moduleAnalytics: (period = "30d") =>
    apiClient.get<SocialModuleAnalytics>(`${BFF}/analytics/module?period=${period}`, {
      tenantScoped: true,
    }),
};
