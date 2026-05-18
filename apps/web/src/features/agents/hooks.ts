"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { agentsApi } from "@/features/agents/api";
import { AgentTaskPreset } from "@/features/agents/types";

export function toAgentStatus(status: string) {
  const s = status.toLowerCase();
  if (s.includes("run") || s.includes("process")) return "running";
  if (s.includes("success") || s.includes("complete") || s.includes("done") || s.includes("delivered")) {
    return "success";
  }
  if (s.includes("error") || s.includes("fail")) return "error";
  return "queued";
}

export function useAgentRuns() {
  return useQuery({
    queryKey: ["agents", "runs"],
    queryFn: agentsApi.listRuns,
  });
}

export function useAgentRun(id: number) {
  return useQuery({
    queryKey: ["agents", "runs", id],
    queryFn: () => agentsApi.getRunById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useLaunchAgentRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: AgentTaskPreset) =>
      agentsApi.createRun({
        job_type: preset.job_type,
        status: "queued",
        source: "agent_launcher_v1",
        priority: "normal",
        input_data: JSON.stringify({ preset: preset.key, params: preset.input }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents", "runs"] });
      toastSuccess("Agent run queued.");
    },
    onError: () => {
      toastError("Could not queue agent run.");
    },
  });
}
