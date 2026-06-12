import type { ContactStatus, PipelineStage } from "./SaasCrmService";

export type EtlSource = "contacts" | "crm_contacts";

export const ETL_TAG_PREFIX = "etl:" as const;

export function etlSourceTag(source: EtlSource): string {
  return `${ETL_TAG_PREFIX}source:${source}`;
}

export function etlLegacyIdTag(source: EtlSource, legacyId: string): string {
  return `${ETL_TAG_PREFIX}legacy_id:${source}:${legacyId}`;
}

export function hasEtlLegacyTag(tags: string[] | null | undefined, source: EtlSource, legacyId: string): boolean {
  const needle = etlLegacyIdTag(source, legacyId);
  return (tags ?? []).some((t) => t === needle);
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (email == null) return null;
  const t = email.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (phone == null) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6 ? digits : null;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Dedupe: tenant + email; si no hay email → tenant + teléfono + nombre. */
export function buildDedupeKey(
  tenantId: string,
  email: string | null | undefined,
  phone: string | null | undefined,
  name: string,
): string {
  const e = normalizeEmail(email);
  if (e) return `email:${tenantId}:${e}`;
  const p = normalizePhone(phone) ?? "";
  const n = normalizeName(name);
  return `pn:${tenantId}:${p}:${n}`;
}

const SAAS_STATUSES: readonly ContactStatus[] = ["lead", "prospect", "client", "churned"];
const SAAS_STAGES: readonly PipelineStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export function mapLegacyStatusToSaas(raw: string | null | undefined): ContactStatus {
  const v = (raw ?? "lead").trim().toLowerCase();
  if (v === "client" || v === "customer" || v === "closed_won") return "client";
  if (v === "churned" || v === "lost" || v === "closed_lost") return "churned";
  if (v === "prospect" || v === "qualified" || v === "active") return "prospect";
  return "lead";
}

export function mapLegacyStageToSaas(raw: string | null | undefined, status: string | null | undefined): PipelineStage {
  const v = (raw ?? status ?? "new").trim().toLowerCase();
  if (v === "contacted") return "contacted";
  if (v === "qualified") return "qualified";
  if (v === "proposal" || v === "negotiation") return "proposal";
  if (v === "won" || v === "closed_won") return "won";
  if (v === "lost" || v === "closed_lost") return "lost";
  if (v === "lead") return "new";
  return SAAS_STAGES.includes(v as PipelineStage) ? (v as PipelineStage) : "new";
}

export function mergeEtlTags(existing: string[] | null | undefined, extra: string[]): string[] {
  const set = new Set(existing ?? []);
  for (const t of extra) set.add(t);
  return [...set];
}

const CONTACT_SOURCE_RANK: Record<EtlSource, number> = { crm_contacts: 2, contacts: 1 };

/** Resuelve conflicto dedupe: prioriza crm_contacts sobre contacts. */
export function pickContactEtlWinner<T extends { source: EtlSource; legacyId: string }>(group: T[]): T {
  return [...group].sort((a, b) => {
    const rank = CONTACT_SOURCE_RANK[b.source] - CONTACT_SOURCE_RANK[a.source];
    if (rank !== 0) return rank;
    return b.legacyId.localeCompare(a.legacyId);
  })[0];
}
