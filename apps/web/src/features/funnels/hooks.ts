"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { funnelsApi } from "@/features/funnels/api";
import type { FunnelStep } from "@/features/funnels/types";

export function useFunnelsUnifiedReporting() {
  return useQuery({
    queryKey: ["funnels", "unified-reporting"],
    queryFn: () => funnelsApi.unifiedReporting(),
    refetchInterval: 60_000,
  });
}

export function useFunnelsList() {
  return useQuery({
    queryKey: ["funnels", "list"],
    queryFn: () => funnelsApi.list(),
  });
}

export function useFunnel(id: string) {
  return useQuery({
    queryKey: ["funnels", "detail", id],
    queryFn: () => funnelsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useFunnelAnalytics(id: string) {
  return useQuery({
    queryKey: ["funnels", "analytics", id],
    queryFn: () => funnelsApi.analytics(id),
    enabled: Boolean(id),
  });
}

export function useCreateFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; steps?: FunnelStep[]; status?: string }) => funnelsApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["funnels"] });
      toastSuccess("Embudo creado.");
    },
    onError: () => toastError("No se pudo crear el embudo."),
  });
}

export function useUpdateFunnel(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => funnelsApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["funnels"] });
      toastSuccess("Embudo actualizado.");
    },
    onError: () => toastError("No se pudo actualizar el embudo."),
  });
}
