"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { projectsApi } from "@/features/projects/api";
import { ProjectCreateInput } from "@/features/projects/types";

export function useProjects() {
  return useQuery({
    queryKey: ["projects", "list"],
    queryFn: projectsApi.list,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectCreateInput) => projectsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
      toastSuccess("Project created.");
    },
    onError: () => {
      toastError("Could not create project.");
    },
  });
}
