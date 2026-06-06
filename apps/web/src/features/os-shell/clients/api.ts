import { apiClient } from "@/core/api";
import type {
  OsClient,
  OsClientCreateInput,
  OsClientListResponse,
  OsClientUpdateInput,
} from "@/features/os-shell/clients/types";

const BASE = "/api/v1/os/clients";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Canonical os_clients API — used by Clients UI (OS-1-UI-01). */
export const osClientsCanonicalApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    q?: string;
    status?: string;
    sector?: string;
  }) =>
    apiClient.get<OsClientListResponse>(`${BASE}${qs(params ?? {})}`, { tenantScoped: true }),

  getById: (id: string) => apiClient.get<OsClient>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsClientCreateInput) =>
    apiClient.post<OsClient, OsClientCreateInput>(BASE, { body, tenantScoped: true }),

  update: (id: string, body: OsClientUpdateInput) =>
    apiClient.patch<OsClient, OsClientUpdateInput>(`${BASE}/${id}`, { body, tenantScoped: true }),

  archive: (id: string) =>
    apiClient.delete<{ message: string; id: string; status: string }>(`${BASE}/${id}`, {
      tenantScoped: true,
    }),
};
