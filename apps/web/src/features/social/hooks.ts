"use client";

import { useQuery } from "@tanstack/react-query";

import { socialApi } from "@/features/social/api";

export function useSocialUnifiedReporting() {
  return useQuery({
    queryKey: ["social", "unified-reporting"],
    queryFn: () => socialApi.unifiedReporting(),
    refetchInterval: 60_000,
  });
}

export function useSocialMonitoringDashboard(refresh = false) {
  return useQuery({
    queryKey: ["social", "monitoring-dashboard", refresh],
    queryFn: () => socialApi.monitoringDashboard(refresh),
  });
}

export function useSocialSchedulerOverview() {
  return useQuery({
    queryKey: ["social", "scheduler-overview"],
    queryFn: () => socialApi.schedulerOverview(),
  });
}

export function useSocialPublishAnalytics(clientId = "ws-client-1") {
  return useQuery({
    queryKey: ["social", "publish-analytics", clientId],
    queryFn: () => socialApi.publishAnalytics(clientId),
  });
}

export function useSocialModuleAnalytics(period = "30d") {
  return useQuery({
    queryKey: ["social", "module-analytics", period],
    queryFn: () => socialApi.moduleAnalytics(period),
  });
}
