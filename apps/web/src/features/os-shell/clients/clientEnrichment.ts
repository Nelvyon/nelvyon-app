import { apiClient } from "@/core/api";
import type { OsDeliverable } from "@/features/os-shell/deliverables/types";
import type { OsClientLinkedProject } from "@/features/os-shell/clients/types";

const PROJECTS = "/api/v1/os/projects";
const DELIVERABLES = "/api/v1/os/deliverables";

export async function fetchLinkedProjects(clientId: string): Promise<OsClientLinkedProject[]> {
  const res = await apiClient.get<{ items: OsClientLinkedProject[]; total: number }>(
    `${PROJECTS}?client_id=${encodeURIComponent(clientId)}&skip=0&limit=50`,
    { tenantScoped: true },
  );
  return res.items ?? [];
}

export async function fetchRecentDeliverables(clientId: string, limit = 8): Promise<OsDeliverable[]> {
  const res = await apiClient.get<{ items: OsDeliverable[]; total: number }>(
    `${DELIVERABLES}?client_id=${encodeURIComponent(clientId)}&page=1&page_size=${limit}`,
    { tenantScoped: true },
  );
  return res.items ?? [];
}

export function groupProjectsByClientId(
  projects: { id: string; client_id: string; name: string; status: string; priority?: string | null }[],
): Map<string, OsClientLinkedProject[]> {
  const map = new Map<string, OsClientLinkedProject[]>();
  for (const p of projects) {
    const row: OsClientLinkedProject = {
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority,
    };
    const list = map.get(p.client_id) ?? [];
    list.push(row);
    map.set(p.client_id, list);
  }
  return map;
}
