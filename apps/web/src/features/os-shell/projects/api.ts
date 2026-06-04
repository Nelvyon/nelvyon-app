import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type {
  OsCampaignListResponse,
  OsOutputListResponse,
  OsProject,
  OsProjectListResponse,
  OsProjectWriteInput,
} from "./types";

const PROJECTS = "/api/v1/entities/nelvyon_projects";
const OUTPUTS = "/api/v1/entities/nelvyon_outputs";
const CAMPAIGNS = "/api/v1/entities/nelvyon_campaigns";

export const osProjectsApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsProjectListResponse>(
      entityListUrl(PROJECTS, {
        skip: params?.skip,
        limit: params?.limit ?? 200,
        query: params?.query,
        sort: params?.sort ?? "-id",
      }),
      { tenantScoped: true },
    ),

  getById: (id: number) => apiClient.get<OsProject>(`${PROJECTS}/${id}`, { tenantScoped: true }),

  create: (body: OsProjectWriteInput) =>
    apiClient.post<OsProject, OsProjectWriteInput>(PROJECTS, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsProjectWriteInput>) =>
    apiClient.put<OsProject, Partial<OsProjectWriteInput>>(`${PROJECTS}/${id}`, {
      tenantScoped: true,
      body,
    }),

  delete: (id: number) =>
    apiClient.delete<{ message: string; id: number }>(`${PROJECTS}/${id}`, { tenantScoped: true }),

  listOutputsForProject: (projectId: number, limit = 50) =>
    apiClient.get<OsOutputListResponse>(
      entityListUrl(OUTPUTS, { limit, query: { project_id: projectId } }),
      { tenantScoped: true },
    ),

  listCampaignsForProject: (projectId: number, limit = 50) =>
    apiClient.get<OsCampaignListResponse>(
      entityListUrl(CAMPAIGNS, { limit, query: { project_id: projectId } }),
      { tenantScoped: true },
    ),
};
