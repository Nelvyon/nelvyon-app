/**
 * betaPacksRunners.ts — minimal real runners for the 5 beta packs.
 *
 * Each pack runs NELVYON-LANDING via packOrchestrator (real deliverable created,
 * QA gate applied, auto-approve at ≥85). No mocks.
 */
import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import type {
  BetaPackIntake,
  PackRunRecord,
} from "@/lib/packs/types";
import {
  SOCIAL_CALENDAR_PACK_ID,
  CONTENT_STRATEGY_PACK_ID,
  CRO_AUDIT_PACK_ID,
  ANALYTICS_SETUP_PACK_ID,
  BRAND_VOICE_PACK_ID,
} from "@/lib/packs/types";

// ---------------------------------------------------------------------------
// Shared validate + run factory
// ---------------------------------------------------------------------------

export function validateBetaPackIntake(body: unknown, validSectors: string[]): BetaPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  const sectorRaw = String(o.sector ?? "").trim();
  const sector = validSectors.includes(sectorRaw) ? sectorRaw : validSectors[0]!;
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  return {
    business_name,
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    value_proposition,
    primary_cta,
    website_url: o.website_url ? String(o.website_url) : undefined,
    tier: o.tier === "premium" ? "premium" : "professional",
    sector,
  };
}

async function runBetaPack(
  packId: string,
  params: { workspaceId: number; userId: string; intake: BetaPackIntake },
): Promise<PackRunRecord> {
  const meta = PACK_REGISTRY[packId as keyof typeof PACK_REGISTRY]!;
  const intake = params.intake;
  return runGrowthPack({
    workspaceId: params.workspaceId,
    userId: params.userId,
    config: {
      meta,
      intake,
      buildBrief: (i) => ({
        ...buildBaseBrief({ ...i, sector: i.sector }),
        pack_type: packId,
      }),
      primaryCampaign: (i) => ({
        platform: "google",
        campaign_type: "content",
        name: `${meta.name} — ${i.business_name}`,
        content: `${meta.tagline} · ${i.value_proposition}`,
        target_audience: `${i.sector} · ${i.city}`,
        status: "active",
      }),
      buildReport: ({ intake: i, skuResults, saasClientId, saasCampaignId }) => ({
        pack_id: packId,
        pack_name: meta.name,
        business_name: i.business_name,
        sector: i.sector,
        completed_at: new Date().toISOString(),
        summary: `${meta.name} completado para ${i.business_name} en ${i.city}.`,
        portal_path: `/portal/packs/${packId}`,
        kpis: {
          deliverables_published: skuResults.filter((r) => r.passed).length,
          avg_qa_score:
            skuResults.length > 0
              ? Math.round(skuResults.reduce((s, r) => s + r.qa_score, 0) / skuResults.length)
              : 0,
          skus_passed: skuResults.filter((r) => r.passed).length,
          skus_total: skuResults.length,
          saas_client_id: saasClientId,
          saas_campaign_id: saasCampaignId,
        },
        sku_results: skuResults,
        next_steps: [
          "Revisa el entregable en el portal",
          "Personaliza con tu branding en /saas/brand",
        ],
      }),
      projectDescription: (i) => `${meta.name}: ${i.business_name} — ${i.city}`,
    },
  });
}

// ---------------------------------------------------------------------------
// Per-pack exported runners + validators
// ---------------------------------------------------------------------------

const SOCIAL_SECTORS = ["local", "ecommerce", "saas_b2b"];
export function validateSocialCalendarIntake(b: unknown) { return validateBetaPackIntake(b, SOCIAL_SECTORS); }
export function runSocialCalendarPack(p: { workspaceId: number; userId: string; intake: BetaPackIntake }) {
  return runBetaPack(SOCIAL_CALENDAR_PACK_ID, p);
}

const CONTENT_SECTORS = ["local", "ecommerce", "saas_b2b"];
export function validateContentStrategyIntake(b: unknown) { return validateBetaPackIntake(b, CONTENT_SECTORS); }
export function runContentStrategyPack(p: { workspaceId: number; userId: string; intake: BetaPackIntake }) {
  return runBetaPack(CONTENT_STRATEGY_PACK_ID, p);
}

const CRO_SECTORS = ["ecommerce", "saas_b2b", "local"];
export function validateCroAuditIntake(b: unknown) { return validateBetaPackIntake(b, CRO_SECTORS); }
export function runCroAuditPack(p: { workspaceId: number; userId: string; intake: BetaPackIntake }) {
  return runBetaPack(CRO_AUDIT_PACK_ID, p);
}

const ANALYTICS_SECTORS = ["ecommerce", "saas_b2b", "local"];
export function validateAnalyticsSetupIntake(b: unknown) { return validateBetaPackIntake(b, ANALYTICS_SECTORS); }
export function runAnalyticsSetupPack(p: { workspaceId: number; userId: string; intake: BetaPackIntake }) {
  return runBetaPack(ANALYTICS_SETUP_PACK_ID, p);
}

const BRAND_SECTORS = ["local", "ecommerce", "saas_b2b"];
export function validateBrandVoiceIntake(b: unknown) { return validateBetaPackIntake(b, BRAND_SECTORS); }
export function runBrandVoicePack(p: { workspaceId: number; userId: string; intake: BetaPackIntake }) {
  return runBetaPack(BRAND_VOICE_PACK_ID, p);
}
