"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api";
import type { LocalPackCeoMetricsPayload } from "@/lib/packs/localPackCeoMetrics";
import type { SaasB2bCeoMetricsPayload } from "@/lib/packs/saasB2bPackCeoMetrics";
import type { PackId, PackRunRecord, ReportPackId } from "@/lib/packs/types";
import { ANALYTICS_INSIGHTS_PACK_ID } from "@/lib/packs/types";

export type PackCeoMetricsPayload = LocalPackCeoMetricsPayload | SaasB2bCeoMetricsPayload;

export function useKickoffGrowthPack(packId: PackId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post<PackRunRecord, Record<string, unknown>>(`/api/os/packs/${packId}/kickoff`, {
        body,
        tenantScoped: true,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pack-report"] });
    },
  });
}

export function usePackRun(packId: ReportPackId, runId: string | null) {
  return useQuery({
    queryKey: ["pack-run", packId, runId],
    queryFn: () =>
      apiClient.get<PackRunRecord>(`/api/os/packs/${packId}/${runId}`, { tenantScoped: true }),
    enabled: Boolean(runId),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 2000 : false,
  });
}

export function usePackReportLatest(packId?: ReportPackId) {
  const qs = packId ? `?pack_id=${encodeURIComponent(packId)}` : "";
  return useQuery({
    queryKey: ["pack-report", packId ?? "all"],
    queryFn: () =>
      apiClient.get<{
        items: PackRunRecord[];
        latest: PackRunRecord | null;
        live_ceo_metrics?: PackCeoMetricsPayload | null;
      }>(`/api/platform/pack-report${qs}`, { tenantScoped: true }),
    refetchInterval: 60_000,
  });
}

export function useLocalPackCeoMetrics(params?: {
  campaignId?: number | null;
  welcomeStatus?: string;
  welcomeTouches?: number;
  enabled?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.campaignId) search.set("campaign_id", String(params.campaignId));
  if (params?.welcomeStatus) search.set("welcome_status", params.welcomeStatus);
  if (params?.welcomeTouches != null) search.set("welcome_touches", String(params.welcomeTouches));
  const qs = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: [
      "local-pack-ceo-metrics",
      params?.campaignId ?? null,
      params?.welcomeStatus ?? null,
      params?.welcomeTouches ?? null,
    ],
    queryFn: () =>
      apiClient.get<LocalPackCeoMetricsPayload>(
        `/api/platform/packs/local-growth/ceo-metrics${qs}`,
        { tenantScoped: true },
      ),
    enabled: params?.enabled !== false,
    refetchInterval: 60_000,
  });
}

export function useSaasB2bPackCeoMetrics(params?: {
  campaignId?: number | null;
  nurtureStatus?: string;
  nurtureTouches?: number;
  enabled?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.campaignId) search.set("campaign_id", String(params.campaignId));
  if (params?.nurtureStatus) search.set("nurture_status", params.nurtureStatus);
  if (params?.nurtureTouches != null) search.set("nurture_touches", String(params.nurtureTouches));
  const qs = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: [
      "saas-b2b-pack-ceo-metrics",
      params?.campaignId ?? null,
      params?.nurtureStatus ?? null,
      params?.nurtureTouches ?? null,
    ],
    queryFn: () =>
      apiClient.get<SaasB2bCeoMetricsPayload>(
        `/api/platform/packs/saas-b2b-growth/ceo-metrics${qs}`,
        { tenantScoped: true },
      ),
    enabled: params?.enabled !== false,
    refetchInterval: 60_000,
  });
}

/** @deprecated use useKickoffGrowthPack(LOCAL_GROWTH_PACK_ID) */
export function useKickoffLocalGrowthPack() {
  return useKickoffGrowthPack("local-business-growth");
}

export function useKickoffAnalyticsInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post<PackRunRecord, Record<string, unknown>>(
        `/api/os/packs/${ANALYTICS_INSIGHTS_PACK_ID}/kickoff`,
        { body, tenantScoped: true },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pack-report"] });
    },
  });
}

export function useGa4ConnectionStatus() {
  return useQuery({
    queryKey: ["ga4-status"],
    queryFn: () =>
      apiClient.get<{
        connected: boolean;
        property_id: string | null;
        demo_fallback_available: boolean;
      }>("/api/integrations/ga4/status", { tenantScoped: true }),
    refetchInterval: 120_000,
  });
}
