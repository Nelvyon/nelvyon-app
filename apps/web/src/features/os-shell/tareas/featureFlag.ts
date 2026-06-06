/**
 * OS-1-UI-05 — Tasks UI data source.
 *
 * `true` (default): `/api/v1/os/tasks` (UUID, soft-delete archive).
 * `false`: fallback to `/api/v1/entities/os_tasks` (numeric id).
 */
export function isOsTasksCanonicalUiEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_OS_TASKS_CANONICAL_UI;
  if (raw === undefined || raw === "") return true;
  return raw !== "0" && raw.toLowerCase() !== "false";
}
