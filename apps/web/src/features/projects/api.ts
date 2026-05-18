import { apiClient } from "@/core/api";
import { Project, ProjectCreateInput, ProjectListResponse } from "@/features/projects/types";

const BASE = "/api/v1/entities/nelvyon_projects";

export const projectsApi = {
  list: () => apiClient.get<ProjectListResponse>(BASE, { tenantScoped: true }),
  create: (payload: ProjectCreateInput) =>
    apiClient.post<Project, ProjectCreateInput>(BASE, { tenantScoped: true, body: payload }),
};
