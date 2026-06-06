/**
 * OS-1-UI-04 — Projects UI data source.
 *
 * `true` (default): `/api/v1/os/projects` (UUID, soft-delete archive).
 * `false`: fallback to `/api/v1/entities/nelvyon_projects` (numeric id).
 *
 * Other shell modules (pipeline, tareas, documentos) still use legacy API via `legacyApi.ts`.
 */
export function isOsProjectsCanonicalUiEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI;
  if (raw === undefined || raw === "") return true;
  return raw !== "0" && raw.toLowerCase() !== "false";
}
