"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { onboardingApi } from "@/features/onboarding/api";

export function useOnboardingProgress(enabled: boolean) {
  return useQuery({
    queryKey: ["onboarding", "progress"],
    queryFn: onboardingApi.progress,
    enabled,
  });
}

export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepKey, data }: { stepKey: string; data?: Record<string, unknown> }) =>
      onboardingApi.completeStep(stepKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "progress"] });
    },
  });
}
