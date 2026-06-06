import { apiClient } from "@/core/api";
import type {
  OsCanonicalProject,
  OsProjectCreateInput,
  OsProjectListResponse,
  OsProjectUpdateInput,
} from "@/features/os-shell/projects/types";

const BASE = "/api/v1/os/projects";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Canonical os_projects API — used by Projects UI (OS-1-UI-04). */
export const osProjectsCanonicalApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
    priority?: string;
    client_id?: string;
  }) =>
    apiClient.get<OsProjectListResponse>(`${BASE}${qs(params ?? {})}`, { tenantScoped: true }),

  getById: (id: string) => apiClient.get<OsCanonicalProject>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsProjectCreateInput) =>
    apiClient.post<OsCanonicalProject, OsProjectCreateInput>(BASE, { body, tenantScoped: true }),

  update: (id: string, body: OsProjectUpdateInput) =>
    apiClient.patch<OsCanonicalProject, OsProjectUpdateInput>(`${BASE}/${id}`, { body, tenantScoped: true }),

  archive: (id: string) =>
    apiClient.delete<{ message: string; id: string; status: string }>(`${BASE}/${id}`, {
      tenantScoped: true,
    }),
};

export { osProjectsApi, osProjectsLegacyApi } from "./legacyApi";
