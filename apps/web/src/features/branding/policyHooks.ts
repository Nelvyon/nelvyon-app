"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { brandingPolicyApi } from "@/features/branding/policyApi";
import { TenantBrandingActivationPayload } from "@/features/branding/policyTypes";

export function useBrandingPolicy() {
  return useQuery({
    queryKey: ["branding", "v2", "policy"],
    queryFn: brandingPolicyApi.getPolicy,
  });
}

export function useBrandingActivationLogs() {
  return useQuery({
    queryKey: ["branding", "v2", "activation-logs"],
    queryFn: brandingPolicyApi.getActivationLogs,
  });
}

export function useSetBrandingActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TenantBrandingActivationPayload) => brandingPolicyApi.setActivation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branding", "v2"] });
    },
  });
}
