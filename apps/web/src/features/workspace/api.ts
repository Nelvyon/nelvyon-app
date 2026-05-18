import { apiClient } from "@/core/api";
import type { WorkspaceCreateBody, WorkspaceRow } from "@/features/workspace/types";

const BASE = "/api/v1/workspace";

/** No `X-Workspace-Id` — list is user-scoped. */
export const workspaceApi = {
  list: () => apiClient.get<WorkspaceRow[]>(`${BASE}/list`, { tenantScoped: false }),
  create: (body: WorkspaceCreateBody) =>
    apiClient.post<WorkspaceRow, WorkspaceCreateBody>(`${BASE}/create`, { tenantScoped: false, body }),
};
