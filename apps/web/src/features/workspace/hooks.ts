"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceApi } from "@/features/workspace/api";

export function useWorkspaceList(enabled: boolean) {
  return useQuery({
    queryKey: ["workspace", "list"],
    queryFn: workspaceApi.list,
    enabled,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) => workspaceApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "list"] });
    },
  });
}
