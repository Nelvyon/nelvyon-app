import { apiClient } from "@/core/api";

import type { AdvisorEntitlements, AdvisorSessionConsumeResponse } from "@/features/advisor/types";

export const advisorApi = {
  entitlements: () => apiClient.get<AdvisorEntitlements>("/api/v1/advisor/entitlements", { tenantScoped: true }),
  consumeSession: () =>
    apiClient.post<AdvisorSessionConsumeResponse, Record<string, never>>("/api/v1/advisor/sessions/consume", {
      tenantScoped: true,
      body: {},
    }),
};
