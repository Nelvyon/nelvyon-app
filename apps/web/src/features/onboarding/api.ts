import { apiClient } from "@/core/api";
import type { OnboardingProgressResponse, OnboardingStepStatus } from "@/features/onboarding/types";

const BASE = "/api/v1/onboarding";

export const onboardingApi = {
  progress: () => apiClient.get<OnboardingProgressResponse>(`${BASE}/progress`, { tenantScoped: true }),
  completeStep: (stepKey: string, data?: Record<string, unknown>) =>
    apiClient.post<OnboardingStepStatus, { step_key: string; data?: Record<string, unknown> }>(
      `${BASE}/complete-step`,
      { tenantScoped: true, body: { step_key: stepKey, data } },
    ),
};
