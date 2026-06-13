"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { onboardingApi } from "@/features/onboarding/api";
import type { OnboardingProgressResponse } from "@/features/onboarding/types";

export function useOnboardingProgress(enabled: boolean) {
  return useQuery({
    queryKey: ["onboarding", "progress"],
    queryFn: async () => {
      try {
        return await Promise.race([
          onboardingApi.progress(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("onboarding_progress_timeout")), 8_000);
          }),
        ]);
      } catch {
        return {
          workspace_id: 0,
          user_id: "",
          steps: [],
          completed_count: 0,
          total_count: 0,
          progress_percent: 0,
          is_complete: false,
        } satisfies OnboardingProgressResponse;
      }
    },
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
