import { beforeEach, describe, expect, it } from "vitest";
import {
  AdsConnectorBlockedError,
  GoogleAdsConnector,
  LinkedInAdsConnector,
  MetaAdsConnector,
  appendUtmToUrl,
  assertAdsAttributionCoreIntegrity,
  buildCampaignDraft,
  buildReportingSnapshot,
  buildSyntheticAudiences,
  buildUtmParams,
  enforceBudgetCap,
  evaluateAdsApprovalGates,
  getAdsConnector,
  isAdsSpendEnabled,
  listConversionEvents,
  recordConversionEvent,
  resetConversionLedgerForTests,
} from "../AdsAttributionCore";

describe("AdsAttributionCore", () => {
  beforeEach(() => {
    resetConversionLedgerForTests();
    delete process.env.NELVYON_ADS_SPEND_ENABLED;
  });

  it("builds a synthetic campaign draft with zero spend and no OAuth", () => {
    const draft = buildCampaignDraft({
      businessName: "Acme Corp",
      sector: "saas_b2b",
      platform: "linkedin",
      objective: "leads",
      dailyBudgetCents: 5000,
      targetAudience: "VP Engineering",
      primaryCta: "Solicitar demo",
    });
    expect(draft.status).toBe("draft");
    expect(draft.oauthConnected).toBe(false);
    expect(draft.spendCentsToDate).toBe(0);
    expect(draft.creatives.length).toBeGreaterThan(0);
    expect(JSON.stringify(draft)).not.toContain("mock://");
  });

  it("builds synthetic audiences per sector, never real profile data", () => {
    const audiences = buildSyntheticAudiences("ecommerce", "ModaVerde");
    expect(audiences.length).toBeGreaterThan(0);
    expect(audiences.every((a) => a.source === "synthetic_sector_estimate")).toBe(true);
  });

  it("builds and appends UTM params correctly", () => {
    const utm = buildUtmParams({ platform: "google", campaignSlug: "acme-leads", content: "v1" });
    expect(utm.utm_source).toBe("google");
    expect(utm.utm_campaign).toBe("acme-leads");
    const url = appendUtmToUrl("https://acme.test/landing", utm);
    expect(url).toContain("utm_source=google");
    expect(url).toContain("utm_content=v1");
  });

  it("records and lists conversion events in-memory, always marked synthetic", () => {
    const e1 = recordConversionEvent({ campaignId: "c1", eventName: "lead_submitted", valueCents: 500 });
    recordConversionEvent({ campaignId: "c2", eventName: "lead_submitted" });
    expect(e1.synthetic).toBe(true);
    expect(listConversionEvents("c1")).toHaveLength(1);
    expect(listConversionEvents().length).toBeGreaterThanOrEqual(2);
  });

  it("enforceBudgetCap hard-fails on any spend without CEO approval, however small", () => {
    const noBudget = enforceBudgetCap({ dailyBudgetCents: 0, spendCentsSoFar: 0, ceoApproved: false });
    expect(noBudget.ok).toBe(false);

    const zeroSpendNoCeo = enforceBudgetCap({ dailyBudgetCents: 1000, spendCentsSoFar: 0, ceoApproved: false });
    expect(zeroSpendNoCeo.ok).toBe(true);

    const oneCommaSpendNoCeo = enforceBudgetCap({ dailyBudgetCents: 1000, spendCentsSoFar: 1, ceoApproved: false });
    expect(oneCommaSpendNoCeo.ok).toBe(false);
    expect(oneCommaSpendNoCeo.blockers).toContain("spend_without_ceo_approval");

    const spendWithCeo = enforceBudgetCap({ dailyBudgetCents: 1000, spendCentsSoFar: 500, ceoApproved: true });
    expect(spendWithCeo.ok).toBe(true);

    const overCap = enforceBudgetCap({ dailyBudgetCents: 1000, spendCentsSoFar: 1500, ceoApproved: true });
    expect(overCap.ok).toBe(false);
    expect(overCap.blockers).toContain("spend_exceeds_daily_cap");
  });

  it("evaluateAdsApprovalGates requires both CEO and client approval", () => {
    expect(evaluateAdsApprovalGates({ ceoApproved: false, clientApproved: false }).ok).toBe(false);
    expect(evaluateAdsApprovalGates({ ceoApproved: true, clientApproved: false }).ok).toBe(false);
    expect(evaluateAdsApprovalGates({ ceoApproved: true, clientApproved: true }).ok).toBe(true);
  });

  it("reporting snapshot is always synthetic with zero real spend/delivery", () => {
    recordConversionEvent({ campaignId: "c3", eventName: "purchase", valueCents: 1000 });
    const snap = buildReportingSnapshot("c3");
    expect(snap.spendCents).toBe(0);
    expect(snap.impressions).toBe(0);
    expect(snap.clicks).toBe(0);
    expect(snap.conversions).toBe(1);
  });

  it("NELVYON_ADS_SPEND_ENABLED defaults to 0/false", () => {
    expect(isAdsSpendEnabled()).toBe(false);
  });

  it.each([
    ["google", GoogleAdsConnector],
    ["meta", MetaAdsConnector],
    ["linkedin", LinkedInAdsConnector],
  ] as const)("%s connector connect() throws BLOCKED_EXTERNAL, spend() throws SPEND_DISABLED by default", (_label, Ctor) => {
    const connector = new Ctor();
    expect(() => connector.connect()).toThrow(AdsConnectorBlockedError);
    try {
      connector.connect();
    } catch (e) {
      expect((e as AdsConnectorBlockedError).code).toBe("BLOCKED_EXTERNAL");
    }
    expect(() => connector.spend(100)).toThrow(AdsConnectorBlockedError);
    try {
      connector.spend(100);
    } catch (e) {
      expect((e as AdsConnectorBlockedError).code).toBe("SPEND_DISABLED");
    }
  });

  it("spend() still blocked (BLOCKED_EXTERNAL) even when NELVYON_ADS_SPEND_ENABLED=1 — no real provider wired", () => {
    process.env.NELVYON_ADS_SPEND_ENABLED = "1";
    const connector = getAdsConnector("meta");
    expect(() => connector.spend(100)).toThrow(AdsConnectorBlockedError);
    try {
      connector.spend(100);
    } catch (e) {
      expect((e as AdsConnectorBlockedError).code).toBe("BLOCKED_EXTERNAL");
    }
  });

  it("assertAdsAttributionCoreIntegrity passes with no violations", () => {
    const result = assertAdsAttributionCoreIntegrity();
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
