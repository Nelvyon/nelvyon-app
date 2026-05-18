"use client";

import { useQuery } from "@tanstack/react-query";

import { observabilityApi } from "@/features/observability/api";

export function useObservabilityHealth() {
  return useQuery({
    queryKey: ["observability", "v1", "health"],
    queryFn: observabilityApi.health,
  });
}

export function useObservabilityIncidents() {
  return useQuery({
    queryKey: ["observability", "v1", "incidents"],
    queryFn: observabilityApi.incidents,
  });
}

export function useObservabilityAlerts() {
  return useQuery({
    queryKey: ["observability", "v1", "alerts"],
    queryFn: observabilityApi.alerts,
  });
}
