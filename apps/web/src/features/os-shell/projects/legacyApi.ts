import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type {
  OsCampaignListResponse,
  OsLegacyProject,
  OsLegacyProjectListResponse,
  OsLegacyProjectWriteInput,
  OsOutputListResponse,
} from "./types";

const PROJECTS = "/api/v1/entities/nelvyon_projects";
const OUTPUTS = "/api/v1/entities/nelvyon_outputs";
const CAMPAIGNS = "/api/v1/entities/nelvyon_campaigns";

/** Legacy nelvyon_projects API — used by pipeline, tareas, documentos until their UI migrations. */
export const osProjectsLegacyApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsLegacyProjectListResponse>(
      entityListUrl(PROJECTS, {
        skip: params?.skip,
        limit: params?.limit ?? 200,
        query: params?.query,
        sort: params?.sort ?? "-id",
      }),
      { tenantScoped: true },
    ),

  getById: (id: number) => apiClient.get<OsLegacyProject>(`${PROJECTS}/${id}`, { tenantScoped: true }),

  create: (body: OsLegacyProjectWriteInput) =>
    apiClient.post<OsLegacyProject, OsLegacyProjectWriteInput>(PROJECTS, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsLegacyProjectWriteInput>) =>
    apiClient.put<OsLegacyProject, Partial<OsLegacyProjectWriteInput>>(`${PROJECTS}/${id}`, {
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

/** @deprecated Use osProjectsLegacyApi — kept for modules not yet migrated (OS-1-UI-05+). */
export const osProjectsApi = osProjectsLegacyApi;
