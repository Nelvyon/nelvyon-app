/** Dedupe and mapping for nelvyon_projects → os_projects backfill (OS-1-05). */

export type OsProjectStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";

export type OsProjectPriority = "low" | "medium" | "high" | "urgent";

export type LegacyProjectRow = {
  id: number;
  user_id: string;
  workspace_id: number | null;
  client_id: number;
  name: string;
  title: string | null;
  project_type: string;
  status: string | null;
  progress: number | null;
  brief: string | null;
  description: string | null;
  deliverables: string | null;
  deadline: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: string | null;
  budget: string | number | null;
  created_at: Date | null;
  updated_at: Date | null;
};

export const LEGACY_PROJECT_SOURCE = "etl:legacy:nelvyon_projects";

export function normalizeProjectName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

export function resolveLegacyProjectName(row: LegacyProjectRow): string {
  const fromTitle = row.title?.trim();
  if (fromTitle) return fromTitle;
  return row.name.trim();
}

/** Primary dedupe: workspace + legacy nelvyon_projects.id */
export function buildLegacyProjectIdKey(workspaceId: number, legacyProjectId: number): string {
  return `ws:${workspaceId}|legacy:${legacyProjectId}`;
}

/** Fallback dedupe: workspace + os client UUID + normalized name */
export function buildProjectFallbackDedupeKey(
  workspaceId: number,
  osClientId: string,
  projectName: string,
): string {
  return `ws:${workspaceId}|client:${osClientId}|name:${normalizeProjectName(projectName)}`;
}

export function mapLegacyProjectStatus(status: string | null | undefined): OsProjectStatus {
  const s = (status ?? "draft").trim().toLowerCase();
  if (s === "draft" || s === "borrador") return "draft";
  if (["active", "in_progress", "ongoing", "en_curso", "open"].includes(s)) return "active";
  if (["on_hold", "paused", "pause", "pausado", "hold"].includes(s)) return "paused";
  if (["completed", "done", "closed", "completado", "finished"].includes(s)) return "completed";
  if (["cancelled", "canceled", "cancelado"].includes(s)) return "cancelled";
  if (["archived", "archivado"].includes(s)) return "archived";
  return "draft";
}

export function mapLegacyProjectPriority(priority: string | null | undefined): OsProjectPriority {
  const p = (priority ?? "medium").trim().toLowerCase();
  if (p === "low" || p === "baja") return "low";
  if (p === "high" || p === "alta") return "high";
  if (p === "urgent" || p === "urgente") return "urgent";
  return "medium";
}

/** Parse legacy date strings (deadline column) to YYYY-MM-DD or null. */
export function parseLegacyDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = value.trim();
  if (!t) return null;
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1] ?? null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseLegacyBudget(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function metadataLegacyProjectId(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const raw = m.legacy_nelvyon_project_id ?? m.legacy_id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
