/**
 * OS-1-UI-01 — Clients UI data source.
 *
 * `true` (default): `/api/v1/os/clients` (UUID, soft-delete archive).
 * `false`: fallback to `/api/v1/entities/nelvyon_clients` (numeric id).
 *
 * Other shell modules (pipeline, tareas, documentos) still use legacy API via `legacyApi.ts`.
 */
export function isOsClientsCanonicalUiEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI;
  if (raw === undefined || raw === "") return true;
  return raw !== "0" && raw.toLowerCase() !== "false";
}
