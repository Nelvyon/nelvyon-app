"use client";

import { useQuery } from "@tanstack/react-query";

import { excellenceApi } from "@/features/excellence/api";

export function useQaCoreChecklist() {
  return useQuery({
    queryKey: ["excellence", "qa-checklist"],
    queryFn: excellenceApi.checklist,
  });
}

export function useI18nBaselineStatus() {
  return useQuery({
    queryKey: ["excellence", "i18n-baseline"],
    queryFn: excellenceApi.i18n,
  });
}

export function useGoldenPathGate() {
  return useQuery({
    queryKey: ["excellence", "golden-path"],
    queryFn: excellenceApi.goldenPath,
  });
}
