"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { reputacionApi } from "@/features/reputacion/api";

export function useReputacionUnifiedReporting() {
  return useQuery({
    queryKey: ["reputacion", "unified-reporting"],
    queryFn: () => reputacionApi.unifiedReporting(),
    refetchInterval: 60_000,
  });
}

export function useReputacionReviews(sentiment?: string) {
  return useQuery({
    queryKey: ["reputacion", "reviews", sentiment ?? "all"],
    queryFn: () => reputacionApi.listReviews(sentiment ? { sentiment } : undefined),
  });
}

export function useReputacionAlerts() {
  return useQuery({
    queryKey: ["reputacion", "alerts"],
    queryFn: () => reputacionApi.alerts(),
  });
}

export function useReputacionEmbed() {
  return useQuery({
    queryKey: ["reputacion", "embed"],
    queryFn: () => reputacionApi.embed(),
  });
}

export function useConnectGoogleBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reputacionApi.connectGoogle(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reputacion"] });
      toastSuccess("Conexión Google Business iniciada (modo demo).");
    },
    onError: () => toastError("No se pudo conectar Google Business."),
  });
}
