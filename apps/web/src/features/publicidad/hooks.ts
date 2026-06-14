"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { publicidadApi } from "@/features/publicidad/api";
import type { AdsBriefingPayload } from "@/features/publicidad/types";

export function useAdsUnifiedReporting() {
  return useQuery({
    queryKey: ["ads", "unified-reporting"],
    queryFn: () => publicidadApi.unifiedReporting(),
    refetchInterval: 60_000,
  });
}

export function useAdsRoasAlerts(threshold = 1.5) {
  return useQuery({
    queryKey: ["ads", "roas-alerts", threshold],
    queryFn: () => publicidadApi.roasAlerts(threshold),
    refetchInterval: 60_000,
  });
}

export function useAdsGoogleStatus() {
  return useQuery({
    queryKey: ["ads", "google-status"],
    queryFn: () => publicidadApi.googleStatus(),
  });
}

export function useAdsMetaStatus() {
  return useQuery({
    queryKey: ["ads", "meta-status"],
    queryFn: () => publicidadApi.metaStatus(),
  });
}

export function useAdsGoogleReporting() {
  return useQuery({
    queryKey: ["ads", "google-reporting"],
    queryFn: () => publicidadApi.googleReporting(),
  });
}

export function useAdsMetaReporting() {
  return useQuery({
    queryKey: ["ads", "meta-reporting"],
    queryFn: () => publicidadApi.metaReporting(),
  });
}

export function useAdsBriefing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdsBriefingPayload) => publicidadApi.runBriefing(payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["ads"] });
      toastSuccess(
        data.launched
          ? `Campaña lanzada (${data.run_id}).`
          : `Estrategia generada (${data.run_id}).`,
      );
    },
    onError: () => {
      toastError("No se pudo ejecutar el briefing de publicidad.");
    },
  });
}
