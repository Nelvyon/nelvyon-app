import { apiClient } from "@/core/api";

import type { CommunicationsSummary, SignupConfirmationResult } from "@/features/communications/types";

export const communicationsApi = {
  summary: () => apiClient.get<CommunicationsSummary>("/api/v1/communications/v1/summary", { tenantScoped: true }),
  signupConfirmation: (body?: { to_email?: string; to_name?: string }) =>
    apiClient.post<SignupConfirmationResult, { to_email?: string; to_name?: string }>(
      "/api/v1/communications/v1/flows/signup-confirmation",
      { tenantScoped: true, body: body ?? {} },
    ),
};
