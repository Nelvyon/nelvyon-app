"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { dealsApi } from "@/features/deals/api";
import { CreateFollowUpInput, DealUpdateInput } from "@/features/deals/types";

export function useDeals(filters: { stage?: string; owner?: string; clientId?: number }) {
  return useQuery({
    queryKey: ["deals", "list", filters],
    queryFn: () => dealsApi.list(filters),
  });
}

export function useDeal(id: number) {
  return useQuery({
    queryKey: ["deals", "detail", id],
    queryFn: () => dealsApi.getById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useDealFollowUps(dealId: number) {
  return useQuery({
    queryKey: ["deals", "follow-ups", dealId],
    queryFn: () => dealsApi.listFollowUps(dealId),
    enabled: Number.isFinite(dealId) && dealId > 0,
  });
}

export function usePipelineSummary() {
  return useQuery({
    queryKey: ["deals", "pipeline-summary"],
    queryFn: dealsApi.pipelineSummary,
  });
}

export function useUpdateDeal(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DealUpdateInput) => dealsApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["deals"] });
      await queryClient.refetchQueries({ queryKey: ["deals", "detail", id] });
      toastSuccess("Deal updated.");
    },
    onError: () => {
      toastError("Could not update deal.");
    },
  });
}

export function useCreateFollowUp(dealId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFollowUpInput) => dealsApi.createFollowUp(dealId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["deals"] });
      await queryClient.refetchQueries({ queryKey: ["deals", "follow-ups", dealId] });
      await queryClient.refetchQueries({ queryKey: ["deals", "detail", dealId] });
      toastSuccess("Follow-up activity created.");
    },
    onError: () => {
      toastError("Could not create follow-up activity.");
    },
  });
}
