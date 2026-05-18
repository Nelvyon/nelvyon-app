"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { communicationsApi } from "@/features/communications/api";

export function useCommunicationsSummary() {
  return useQuery({
    queryKey: ["communications", "v1", "summary"],
    queryFn: communicationsApi.summary,
  });
}

export function useSignupConfirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: communicationsApi.signupConfirmation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["communications", "v1", "summary"] });
    },
  });
}
