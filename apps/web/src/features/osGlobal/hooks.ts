"use client";

import { useQuery } from "@tanstack/react-query";

import { osGlobalApi } from "@/features/osGlobal/api";

export function useOsGlobalSnapshot() {
  return useQuery({
    queryKey: ["os-global", "snapshot"],
    queryFn: osGlobalApi.snapshot,
  });
}

export function useOsGlobalRiskQueue() {
  return useQuery({
    queryKey: ["os-global", "risk-queue"],
    queryFn: osGlobalApi.riskQueue,
  });
}

export function useOsGlobalChangeJournal() {
  return useQuery({
    queryKey: ["os-global", "change-journal"],
    queryFn: osGlobalApi.changeJournal,
  });
}
