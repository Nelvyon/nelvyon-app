/**
 * Espejo del contrato backend `core/deal_stages.py`.
 * Los ids deben coincidir con la columna deals.stage (whitelist canónica).
 */
export const CANONICAL_DEAL_STAGE_IDS = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

export type CanonicalDealStageId = (typeof CANONICAL_DEAL_STAGE_IDS)[number];

/** Alias legacy en BD → canónico (solo lectura / UX). */
export const LEGACY_STAGE_ALIAS_TO_CANONICAL: Readonly<
  Record<string, CanonicalDealStageId>
> = {
  won: "closed_won",
  closed: "closed_won",
  lost: "closed_lost",
};

const CANONICAL_SET = new Set<string>(CANONICAL_DEAL_STAGE_IDS);

/**
 * Agrupa un valor de deals.stage (canónico o legacy en BD) en una columna Kanban canónica.
 * Valores desconocidos → "lead" (sin crear columnas extra).
 */
export function bucketDealStageForKanban(
  raw: string | null | undefined
): CanonicalDealStageId {
  if (raw == null || String(raw).trim() === "") return "lead";
  const s = String(raw).trim().toLowerCase();
  if (CANONICAL_SET.has(s)) return s as CanonicalDealStageId;
  const mapped = LEGACY_STAGE_ALIAS_TO_CANONICAL[s];
  if (mapped) return mapped;
  return "lead";
}

/** True si el literal persistido no es canónico ni alias legacy reconocido (datos heredados). */
export function isNonCanonicalPersistedStage(
  raw: string | null | undefined
): boolean {
  if (raw == null || String(raw).trim() === "") return false;
  const s = String(raw).trim().toLowerCase();
  if (CANONICAL_SET.has(s)) return false;
  return !(s in LEGACY_STAGE_ALIAS_TO_CANONICAL);
}
