"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { campaignsApi } from "@/features/campaigns/api";
import { CampaignCreateInput, CampaignUpdateInput } from "@/features/campaigns/types";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: campaignsApi.list,
  });
}

export function useCampaign(id: number) {
  return useQuery({
    queryKey: ["campaigns", "detail", id],
    queryFn: () => campaignsApi.getById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CampaignCreateInput) => campaignsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding", "progress"] });
      trackProductEvent("campaign_bootstrap_completed", { module: "campaigns" });
      toastSuccess("Campaign created.");
    },
    onError: () => {
      toastError("Could not create campaign.");
    },
  });
}

export function useUpdateCampaign(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CampaignUpdateInput) => campaignsApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
      await queryClient.refetchQueries({ queryKey: ["campaigns", "detail", id] });
      toastSuccess("Campaign updated.");
    },
    onError: () => {
      toastError("Could not save campaign.");
    },
  });
}
