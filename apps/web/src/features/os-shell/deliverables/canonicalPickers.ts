import { apiClient } from "@/core/api";
import type { OsCanonicalClient, OsCanonicalProject } from "@/features/os-shell/deliverables/types";

const CLIENTS = "/api/v1/os/clients";
const PROJECTS = "/api/v1/os/projects";

export async function fetchCanonicalClients(): Promise<OsCanonicalClient[]> {
  const res = await apiClient.get<{
    items: OsCanonicalClient[];
    total: number;
  }>(`${CLIENTS}?page=1&page_size=200`, { tenantScoped: true });
  return res.items ?? [];
}

export async function fetchCanonicalProjects(clientId?: string): Promise<OsCanonicalProject[]> {
  const q = clientId ? `?page=1&page_size=200&client_id=${encodeURIComponent(clientId)}` : "?page=1&page_size=200";
  const res = await apiClient.get<{ items: OsCanonicalProject[]; total: number }>(
    `${PROJECTS}${q}`,
    { tenantScoped: true },
  );
  return res.items ?? [];
}

export async function resolveCanonicalClientId(legacyNelvyonId?: number): Promise<string | undefined> {
  if (!legacyNelvyonId) return undefined;
  const clients = await fetchCanonicalClients();
  return clients.find((c) => c.legacy_nelvyon_client_id === legacyNelvyonId)?.id;
}

export async function resolveCanonicalProjectId(legacyNelvyonId?: number): Promise<string | undefined> {
  if (!legacyNelvyonId) return undefined;
  const projects = await fetchCanonicalProjects();
  return projects.find(
    (p) => Number(p.metadata?.legacy_nelvyon_project_id) === legacyNelvyonId,
  )?.id;
}
