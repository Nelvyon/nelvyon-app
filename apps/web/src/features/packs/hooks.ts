"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api";
import type { PackId, PackRunRecord } from "@/lib/packs/types";

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

export function usePackRun(packId: PackId, runId: string | null) {
  return useQuery({
    queryKey: ["pack-run", packId, runId],
    queryFn: () =>
      apiClient.get<PackRunRecord>(`/api/os/packs/${packId}/${runId}`, { tenantScoped: true }),
    enabled: Boolean(runId),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 2000 : false,
  });
}

export function usePackReportLatest(packId?: PackId) {
  const qs = packId ? `?pack_id=${encodeURIComponent(packId)}` : "";
  return useQuery({
    queryKey: ["pack-report", packId ?? "all"],
    queryFn: () =>
      apiClient.get<{ items: PackRunRecord[]; latest: PackRunRecord | null }>(
        `/api/platform/pack-report${qs}`,
        { tenantScoped: true },
      ),
  });
}

/** @deprecated use useKickoffGrowthPack(LOCAL_GROWTH_PACK_ID) */
export function useKickoffLocalGrowthPack() {
  return useKickoffGrowthPack("local-business-growth");
}
