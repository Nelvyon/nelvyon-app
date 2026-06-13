"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import {
  automationsActionsApi,
  automationsJobsApi,
  automationsWebhooksApi,
} from "@/features/automations/api";
import { AutomationWebhookUpdateInput } from "@/features/automations/types";

export function useAutomationJobs() {
  return useQuery({
    queryKey: ["automations", "jobs"],
    queryFn: automationsJobsApi.list,
  });
}

export function useAutomationJob(id: number) {
  return useQuery({
    queryKey: ["automations", "jobs", id],
    queryFn: () => automationsJobsApi.getById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAutomationWebhooks() {
  return useQuery({
    queryKey: ["automations", "webhooks"],
    queryFn: automationsWebhooksApi.list,
  });
}

export function useAutomationWebhook(id: number) {
  return useQuery({
    queryKey: ["automations", "webhooks", id],
    queryFn: () => automationsWebhooksApi.getById(id),
    enabled: Number.isFinite(id),
  });
}

export function useRetryAutomationJob(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => automationsActionsApi.retryJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["automations", "jobs", jobId] });
      toastSuccess("Retry requested.");
    },
    onError: () => {
      toastError("No se pudo reintentar el job.");
    },
  });
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AutomationWebhookUpdateInput) => automationsWebhooksApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations", "webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["automations", "webhooks", id] });
    },
  });
}
