"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { saasDealsApi } from "./api";
import type { CreateDealInput, DealListFilters, DealStage, UpdateDealInput } from "./types";

export const saasDealsQueryKeys = {
  all: ["saas-deals"] as const,
  list: (filters: DealListFilters) => ["saas-deals", "list", filters] as const,
  detail: (id: string) => ["saas-deals", "detail", id] as const,
  metrics: ["saas-deals", "metrics"] as const,
  contactDetail: (contactId: string) => ["saas-deals", "contact", contactId] as const,
};

export function useSaasDeals(filters: DealListFilters = {}) {
  return useQuery({
    queryKey: saasDealsQueryKeys.list(filters),
    queryFn: () => saasDealsApi.list(filters),
  });
}

export function useSaasDeal(dealId: string | null) {
  return useQuery({
    queryKey: saasDealsQueryKeys.detail(dealId ?? ""),
    queryFn: () => saasDealsApi.getById(dealId!),
    enabled: Boolean(dealId),
  });
}

export function useSaasDealMetrics() {
  return useQuery({
    queryKey: saasDealsQueryKeys.metrics,
    queryFn: () => saasDealsApi.metrics(),
  });
}

export function useSaasContactDetail(contactId: string | null) {
  return useQuery({
    queryKey: saasDealsQueryKeys.contactDetail(contactId ?? ""),
    queryFn: () => saasDealsApi.getContactDetail(contactId!),
    enabled: Boolean(contactId),
  });
}

async function invalidateDealsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: saasDealsQueryKeys.all });
}

export function useChangeDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, stage, probability }: { dealId: string; stage: DealStage; probability?: number }) =>
      saasDealsApi.changeStage(dealId, stage, probability),
    onSuccess: async () => {
      await invalidateDealsQueries(queryClient);
    },
  });
}

export function useCreateSaasDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => saasDealsApi.create(input),
    onSuccess: async () => {
      await invalidateDealsQueries(queryClient);
    },
  });
}

export function useUpdateSaasDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, input }: { dealId: string; input: UpdateDealInput }) =>
      saasDealsApi.update(dealId, input),
    onSuccess: async () => {
      await invalidateDealsQueries(queryClient);
    },
  });
}

export function useDeleteSaasDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => saasDealsApi.delete(dealId),
    onSuccess: async () => {
      await invalidateDealsQueries(queryClient);
    },
  });
}
