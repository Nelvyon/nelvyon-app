import { TERMINAL_PROJECT_STATUSES } from "@/features/os-shell/constants";
import type { OsProject } from "@/features/os-shell/projects/types";

import type { OsClientMetrics } from "./types";

export function deriveClientOperationalLabel(
  projectsForClient: OsProject[],
): { label: string; tone: "success" | "neutral" | "warning" } {
  if (projectsForClient.length === 0) {
    return { label: "Sin proyectos", tone: "neutral" };
  }
  const active = projectsForClient.filter(
    (p) => !TERMINAL_PROJECT_STATUSES.has((p.status ?? "").toLowerCase()),
  ).length;
  if (active > 0) return { label: `${active} proyecto(s) activo(s)`, tone: "success" };
  return { label: "Solo histórico", tone: "warning" };
}

export function buildProjectsByClient(projects: OsProject[]): Map<number, OsProject[]> {
  const map = new Map<number, OsProject[]>();
  for (const p of projects) {
    const list = map.get(p.client_id) ?? [];
    list.push(p);
    map.set(p.client_id, list);
  }
  return map;
}

export function computeClientMetrics(
  projects: OsProject[],
  outputsCount: number,
  campaignsCount: number,
): OsClientMetrics {
  const active = projects.filter(
    (p) => !TERMINAL_PROJECT_STATUSES.has((p.status ?? "").toLowerCase()),
  ).length;
  return {
    projectsTotal: projects.length,
    projectsActive: active,
    outputsTotal: outputsCount,
    campaignsTotal: campaignsCount,
  };
}
