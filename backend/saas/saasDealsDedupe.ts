export type DealStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export type DealEtlSource = "deals" | "crm_deals" | "pipeline_deals";

export const DEAL_ETL_PREFIX = "etl:legacy_id:" as const;

export function etlDealLegacySourceTag(source: DealEtlSource, legacyId: string): string {
  return `${DEAL_ETL_PREFIX}${source}:${legacyId}`;
}

export function hasDealEtlLegacySource(source: string | null | undefined, sourceType: DealEtlSource, legacyId: string): boolean {
  const needle = etlDealLegacySourceTag(sourceType, legacyId);
  return (source ?? "").trim() === needle;
}

export function normalizeDealTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Dedupe: tenant + contacto (o sin contacto) + título + valor redondeado. */
export function buildDealDedupeKey(
  tenantId: string,
  contactId: string | null | undefined,
  title: string,
  value: number,
): string {
  const cid = contactId?.trim() || "_none_";
  const t = normalizeDealTitle(title);
  const v = Math.round(value * 100) / 100;
  return `deal:${tenantId}:${cid}:${t}:${v}`;
}

const SAAS_STAGES: readonly DealStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export function mapLegacyDealStageToSaas(raw: string | null | undefined): DealStage {
  const v = (raw ?? "new").trim().toLowerCase();
  if (v === "contacted") return "contacted";
  if (v === "qualified") return "qualified";
  if (v === "proposal" || v === "negotiation") return "proposal";
  if (v === "won" || v === "closed_won" || v === "ganado") return "won";
  if (v === "lost" || v === "closed_lost" || v === "perdido") return "lost";
  if (v === "lead" || v === "nuevo" || v === "new") return "new";
  return SAAS_STAGES.includes(v as DealStage) ? (v as DealStage) : "new";
}

export const OPEN_DEAL_STAGES: readonly DealStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
] as const;

export function isOpenDealStage(stage: DealStage): boolean {
  return (OPEN_DEAL_STAGES as readonly string[]).includes(stage);
}

const DEAL_SOURCE_RANK: Record<DealEtlSource, number> = {
  crm_deals: 3,
  deals: 2,
  pipeline_deals: 1,
};

/** Resuelve conflicto dedupe: crm_deals > deals > pipeline_deals. */
export function pickDealEtlWinner<T extends { source: DealEtlSource; legacyId: string }>(group: T[]): T {
  return [...group].sort((a, b) => {
    const rank = DEAL_SOURCE_RANK[b.source] - DEAL_SOURCE_RANK[a.source];
    if (rank !== 0) return rank;
    return b.legacyId.localeCompare(a.legacyId);
  })[0];
}
