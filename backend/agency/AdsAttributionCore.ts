/**
 * Ads & attribution CORE — synthetic campaign draft, audiences, UTM, conversion ledger and
 * budget-cap enforcement. Every real ad-network provider connector is fail-closed: `connect()`
 * always throws `BLOCKED_EXTERNAL` (no OAuth integration exists), `spend()` always throws
 * `SPEND_DISABLED`/`BLOCKED_EXTERNAL` (no real spend path exists, regardless of the env flag).
 *
 * `NELVYON_ADS_SPEND_ENABLED` defaults to `0`. Setting it to `1` does NOT unlock real spend —
 * there is no real provider integration wired in this codebase; the flag only changes which
 * error code a blocked `spend()` call raises, as an explicit signal for future real integration
 * work. Real spend requires: OAuth per platform + CEO written budget approval + a rewrite of
 * these connectors — see `docs/ops/ADS_OAUTH_SPEND_CEO_CHECKLIST.md`.
 */

export type AdsPlatform = "google" | "meta" | "linkedin";
export type AdsObjective = "awareness" | "traffic" | "leads" | "sales" | "app_installs";

export type AdsCampaignDraftInput = {
  businessName: string;
  sector: string;
  platform: AdsPlatform;
  objective: AdsObjective;
  dailyBudgetCents: number;
  targetAudience: string;
  primaryCta: string;
  landingUrl?: string;
};

export type AdsCreativeMetadata = {
  headline: string;
  description: string;
  format: "single_image" | "carousel" | "video" | "responsive_search" | "text_ad";
  aspectRatio: string;
  callToAction: string;
};

export type AdsCampaignDraft = {
  id: string;
  platform: AdsPlatform;
  objective: AdsObjective;
  businessName: string;
  sector: string;
  dailyBudgetCents: number;
  targetAudience: string;
  creatives: AdsCreativeMetadata[];
  status: "draft";
  oauthConnected: false;
  spendCentsToDate: 0;
  createdAt: string;
};

export type AdsAudienceSynthetic = {
  id: string;
  label: string;
  estimatedSizeRange: string;
  criteria: string[];
  source: "synthetic_sector_estimate";
};

export type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
};

export type ConversionEvent = {
  id: string;
  campaignId: string;
  eventName: string;
  valueCents: number;
  occurredAt: string;
  synthetic: true;
};

export type BudgetCapCheckInput = {
  dailyBudgetCents: number;
  spendCentsSoFar: number;
  ceoApproved: boolean;
};

export type BudgetCapCheckResult = {
  ok: boolean;
  blockers: string[];
};

export type AdsApprovalGateInput = {
  ceoApproved: boolean;
  clientApproved: boolean;
};

export type AdsApprovalGateResult = {
  ok: boolean;
  blockers: string[];
};

export type AdsReportingSnapshot = {
  campaignId: string;
  generatedAt: string;
  impressions: 0;
  clicks: 0;
  conversions: number;
  spendCents: 0;
  note: string;
};

let draftSeq = 0;
let conversionSeq = 0;
const CONVERSION_LEDGER: ConversionEvent[] = [];

function nextId(prefix: string, seq: number): string {
  return `${prefix}_${Date.now()}_${seq}`;
}

export function buildCampaignDraft(input: AdsCampaignDraftInput): AdsCampaignDraft {
  draftSeq += 1;
  const creatives = buildCreativeMetadata(input);
  return {
    id: nextId("adsdraft", draftSeq),
    platform: input.platform,
    objective: input.objective,
    businessName: input.businessName,
    sector: input.sector,
    dailyBudgetCents: Math.max(0, Math.round(input.dailyBudgetCents)),
    targetAudience: input.targetAudience,
    creatives,
    status: "draft",
    oauthConnected: false,
    spendCentsToDate: 0,
    createdAt: new Date().toISOString(),
  };
}

function buildCreativeMetadata(input: AdsCampaignDraftInput): AdsCreativeMetadata[] {
  const base = {
    headline: `${input.businessName} — ${input.primaryCta}`.slice(0, 90),
    description: `Descubre ${input.businessName} para ${input.sector}. ${input.primaryCta}.`.slice(0, 180),
    callToAction: input.primaryCta,
  };
  if (input.platform === "linkedin") {
    return [{ ...base, format: "single_image", aspectRatio: "1.91:1" }];
  }
  if (input.platform === "google") {
    return [{ ...base, format: "responsive_search", aspectRatio: "n/a" }];
  }
  return [
    { ...base, format: "single_image", aspectRatio: "1:1" },
    { ...base, format: "carousel", aspectRatio: "4:5" },
  ];
}

const AUDIENCE_ARCHETYPES_BY_SECTOR: Record<string, string[]> = {
  local: ["Vecinos radio 5km", "Búsqueda intención local reciente"],
  ecommerce: ["Visitantes web últimos 30 días (concepto)", "Interés en categoría de producto"],
  saas_b2b: ["Perfil de cargo ICP en LinkedIn (concepto)", "Visitantes de páginas de pricing (concepto)"],
};

export function buildSyntheticAudiences(sector: string, businessName: string): AdsAudienceSynthetic[] {
  const criteria = AUDIENCE_ARCHETYPES_BY_SECTOR[sector] ?? ["Audiencia genérica por sector"];
  return criteria.map((c, i) => ({
    id: `aud_${i + 1}`,
    label: `${businessName} · ${c}`,
    estimatedSizeRange: i === 0 ? "10k-50k" : "1k-10k",
    criteria: [c],
    source: "synthetic_sector_estimate",
  }));
}

export function buildUtmParams(params: {
  platform: AdsPlatform;
  campaignSlug: string;
  content?: string;
  term?: string;
}): UtmParams {
  return {
    utm_source: params.platform,
    utm_medium: "paid_social_or_search",
    utm_campaign: params.campaignSlug,
    ...(params.content ? { utm_content: params.content } : {}),
    ...(params.term ? { utm_term: params.term } : {}),
  };
}

export function appendUtmToUrl(url: string, utm: UtmParams): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(utm)) {
    if (v) u.searchParams.set(k, v);
  }
  return u.toString();
}

/** In-memory synthetic conversion ledger — no real ad-pixel/webhook wired. */
export function recordConversionEvent(input: {
  campaignId: string;
  eventName: string;
  valueCents?: number;
}): ConversionEvent {
  conversionSeq += 1;
  const event: ConversionEvent = {
    id: nextId("conv", conversionSeq),
    campaignId: input.campaignId,
    eventName: input.eventName,
    valueCents: Math.max(0, Math.round(input.valueCents ?? 0)),
    occurredAt: new Date().toISOString(),
    synthetic: true,
  };
  CONVERSION_LEDGER.push(event);
  return event;
}

export function listConversionEvents(campaignId?: string): ConversionEvent[] {
  return campaignId ? CONVERSION_LEDGER.filter((e) => e.campaignId === campaignId) : [...CONVERSION_LEDGER];
}

export function resetConversionLedgerForTests(): void {
  CONVERSION_LEDGER.length = 0;
  conversionSeq = 0;
  draftSeq = 0;
}

/**
 * Hard fail-closed budget cap check: ANY spend greater than zero without explicit CEO
 * approval is a hard blocker, regardless of how small. A non-positive/invalid daily budget
 * is also a blocker (never silently default to an arbitrary cap).
 */
export function enforceBudgetCap(input: BudgetCapCheckInput): BudgetCapCheckResult {
  const blockers: string[] = [];
  if (!Number.isFinite(input.dailyBudgetCents) || input.dailyBudgetCents <= 0) {
    blockers.push("daily_budget_cap_missing_or_invalid");
  }
  if (input.spendCentsSoFar > 0 && !input.ceoApproved) {
    blockers.push("spend_without_ceo_approval");
  }
  if (input.spendCentsSoFar > input.dailyBudgetCents) {
    blockers.push("spend_exceeds_daily_cap");
  }
  return { ok: blockers.length === 0, blockers };
}

export function evaluateAdsApprovalGates(input: AdsApprovalGateInput): AdsApprovalGateResult {
  const blockers: string[] = [];
  if (!input.ceoApproved) blockers.push("ceo_approval_missing");
  if (!input.clientApproved) blockers.push("client_approval_missing");
  return { ok: blockers.length === 0, blockers };
}

/** Synthetic-only reporting — impressions/clicks/spend are always zero (no real delivery). */
export function buildReportingSnapshot(campaignId: string): AdsReportingSnapshot {
  return {
    campaignId,
    generatedAt: new Date().toISOString(),
    impressions: 0,
    clicks: 0,
    conversions: listConversionEvents(campaignId).length,
    spendCents: 0,
    note: "Snapshot sintético — sin entrega real, sin gasto real (proveedores fail-closed).",
  };
}

export function isAdsSpendEnabled(): boolean {
  return process.env.NELVYON_ADS_SPEND_ENABLED?.trim() === "1";
}

export class AdsConnectorBlockedError extends Error {
  code: "BLOCKED_EXTERNAL" | "SPEND_DISABLED";
  constructor(code: "BLOCKED_EXTERNAL" | "SPEND_DISABLED", message: string) {
    super(message);
    this.name = "AdsConnectorBlockedError";
    this.code = code;
  }
}

abstract class BaseAdsConnector {
  abstract readonly platform: AdsPlatform;

  /** No real OAuth integration exists — always fail-closed. */
  connect(): never {
    throw new AdsConnectorBlockedError(
      "BLOCKED_EXTERNAL",
      `${this.platform} OAuth connect is blocked — no real ${this.platform} Ads integration is wired in this codebase. CEO authorization + real OAuth implementation are required first.`,
    );
  }

  /**
   * No real spend path exists regardless of the flag. When the flag is OFF the error
   * signals the flag; when ON it still fails because there is no provider integration —
   * this is intentional defense in depth so flipping the flag alone can never spend money.
   */
  spend(_amountCents: number): never {
    if (!isAdsSpendEnabled()) {
      throw new AdsConnectorBlockedError(
        "SPEND_DISABLED",
        `${this.platform} spend is disabled — NELVYON_ADS_SPEND_ENABLED=0. CEO must set it to 1 and a real provider integration must exist before any spend call can succeed.`,
      );
    }
    throw new AdsConnectorBlockedError(
      "BLOCKED_EXTERNAL",
      `${this.platform} spend is blocked — flag is ON but no real ${this.platform} Ads provider integration is wired in this codebase.`,
    );
  }
}

export class GoogleAdsConnector extends BaseAdsConnector {
  readonly platform: AdsPlatform = "google";
}

export class MetaAdsConnector extends BaseAdsConnector {
  readonly platform: AdsPlatform = "meta";
}

export class LinkedInAdsConnector extends BaseAdsConnector {
  readonly platform: AdsPlatform = "linkedin";
}

export function getAdsConnector(platform: AdsPlatform): GoogleAdsConnector | MetaAdsConnector | LinkedInAdsConnector {
  if (platform === "google") return new GoogleAdsConnector();
  if (platform === "meta") return new MetaAdsConnector();
  return new LinkedInAdsConnector();
}

export function assertAdsAttributionCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (isAdsSpendEnabled()) violations.push("spend_flag_must_default_off_in_test_env");

  for (const platform of ["google", "meta", "linkedin"] as const) {
    const connector = getAdsConnector(platform);
    try {
      connector.connect();
      violations.push(`connect_must_throw:${platform}`);
    } catch (e) {
      if (!(e instanceof AdsConnectorBlockedError) || e.code !== "BLOCKED_EXTERNAL") {
        violations.push(`connect_wrong_error:${platform}`);
      }
    }
    try {
      connector.spend(100);
      violations.push(`spend_must_throw:${platform}`);
    } catch (e) {
      if (!(e instanceof AdsConnectorBlockedError)) {
        violations.push(`spend_wrong_error_type:${platform}`);
      }
    }
  }

  const zeroSpendNoCeo = enforceBudgetCap({ dailyBudgetCents: 1000, spendCentsSoFar: 0, ceoApproved: false });
  if (!zeroSpendNoCeo.ok) violations.push("zero_spend_without_ceo_should_be_allowed_at_budget_layer");

  const anySpendNoCeo = enforceBudgetCap({ dailyBudgetCents: 1000, spendCentsSoFar: 1, ceoApproved: false });
  if (anySpendNoCeo.ok) violations.push("any_spend_without_ceo_must_hard_fail");

  return { ok: violations.length === 0, violations };
}
