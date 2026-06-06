import { apiClient } from "@/core/api";
import type {
  OsCanonicalTask,
  OsTaskCreateInput,
  OsTaskListResponse,
  OsTaskUpdateInput,
} from "@/features/os-shell/tareas/types";

const BASE = "/api/v1/os/tasks";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Canonical os_tasks API — used by Tasks UI (OS-1-UI-05). */
export const osTasksCanonicalApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
    priority?: string;
    project_id?: string;
    client_id?: string;
    assignee?: string;
  }) =>
    apiClient.get<OsTaskListResponse>(`${BASE}${qs(params ?? {})}`, { tenantScoped: true }),

  getById: (id: string) => apiClient.get<OsCanonicalTask>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsTaskCreateInput) =>
    apiClient.post<OsCanonicalTask, OsTaskCreateInput>(BASE, { body, tenantScoped: true }),

  update: (id: string, body: OsTaskUpdateInput) =>
    apiClient.patch<OsCanonicalTask, OsTaskUpdateInput>(`${BASE}/${id}`, { body, tenantScoped: true }),

  archive: (id: string) =>
    apiClient.delete<{ message: string; id: string; status: string }>(`${BASE}/${id}`, {
      tenantScoped: true,
    }),
};

export { osTasksApi, osTasksLegacyApi } from "./legacyApi";
