import { TERMINAL_PROJECT_STATUSES } from "@/features/os-shell/constants";
import type { OsClientLinkedProject, OsClientMetrics } from "./types";

export function deriveClientOperationalLabel(
  projectsForClient: OsClientLinkedProject[],
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

export function computeClientMetrics(
  projects: OsClientLinkedProject[],
  deliverablesCount: number,
): OsClientMetrics {
  const active = projects.filter(
    (p) => !TERMINAL_PROJECT_STATUSES.has((p.status ?? "").toLowerCase()),
  ).length;
  return {
    projectsTotal: projects.length,
    projectsActive: active,
    deliverablesTotal: deliverablesCount,
  };
}
