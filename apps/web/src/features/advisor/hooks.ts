"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { advisorApi } from "@/features/advisor/api";

export function useAdvisorEntitlements() {
  return useQuery({
    queryKey: ["advisor", "entitlements"],
    queryFn: advisorApi.entitlements,
  });
}

export function useConsumeAdvisorSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: advisorApi.consumeSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["advisor", "entitlements"] });
    },
  });
}
