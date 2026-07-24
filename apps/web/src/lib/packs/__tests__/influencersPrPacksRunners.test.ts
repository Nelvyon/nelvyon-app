import { describe, expect, it } from "vitest";
import { buildInfluencersPrArtifacts } from "../influencersPrPackProduction";
import { validateInfluencersPrIntake } from "../influencersPrPacksRunners";
import { isOsPackFeatureEnabled } from "../osPackFlags";
import { INFLUENCERS_PR_PACK_ID } from "../types";
import { PACK_REGISTRY, resolvePackId } from "../packRegistry";
import { getPackOsBinding } from "@/lib/os-core/packOsBridge";

const VALID_BASE = {
  business_name: "Test Biz",
  city: "Madrid",
  value_proposition: "Best product ever",
  primary_cta: "Contactar",
  sector: "local",
};

describe("influencers-pr-pack contract", () => {
  it("validateInfluencersPrIntake — valid / invalid", () => {
    expect(validateInfluencersPrIntake(VALID_BASE)).not.toBeNull();
    expect(validateInfluencersPrIntake({ ...VALID_BASE, business_name: "" })).toBeNull();
    expect(validateInfluencersPrIntake(null)).toBeNull();
  });

  it("buildInfluencersPrArtifacts returns real research/scoring/outreach/contract/metrics deliverables with QA>=85", () => {
    const art = buildInfluencersPrArtifacts(VALID_BASE, 88);
    expect(art.research_matching.candidates.length).toBeGreaterThan(0);
    expect(art.scoring_sheet.criteria.length).toBeGreaterThan(0);
    expect(art.scoring_sheet.ranking.length).toBe(art.research_matching.candidates.length);
    expect(art.brief_outreach.disclosure_requirements.length).toBeGreaterThan(0);
    expect(art.contract_checklist.clauses.length).toBeGreaterThan(0);
    expect(art.metrics_plan.kpis.length).toBeGreaterThan(0);
    for (const part of [
      art.research_matching,
      art.scoring_sheet,
      art.brief_outreach,
      art.contract_checklist,
      art.metrics_plan,
    ]) {
      expect(part.qa_score).toBeGreaterThanOrEqual(85);
      expect(part.production).toBe(true);
    }
    expect(JSON.stringify(art)).not.toContain("mock://");
  });

  it("outreach is never authorized anywhere in the artifacts (no real send)", () => {
    const art = buildInfluencersPrArtifacts(VALID_BASE, 90);
    expect(art.research_matching.outreach_authorized).toBe(false);
    expect(art.brief_outreach.outreach_authorized).toBe(false);
    expect(art.contract_checklist.outreach_authorized).toBe(false);
    expect(art.research_matching.candidates.every((c) => c.real_profile_identified === false)).toBe(true);
    expect(art.research_matching.candidates.every((c) => c.source === "synthetic_sector_archetype")).toBe(true);
  });

  it("is registered in PACK_REGISTRY with OS binding and default-OFF flag outside staging", () => {
    expect(resolvePackId(INFLUENCERS_PR_PACK_ID)).toBe(INFLUENCERS_PR_PACK_ID);
    expect(PACK_REGISTRY[INFLUENCERS_PR_PACK_ID].skuSequence).toContain("NELVYON-CHATBOT");
    expect(getPackOsBinding(INFLUENCERS_PR_PACK_ID)).toBeTruthy();

    const prev = process.env.NELVYON_INFLUENCERS_PR_PACK;
    process.env.NELVYON_INFLUENCERS_PR_PACK = "0";
    expect(isOsPackFeatureEnabled("NELVYON_INFLUENCERS_PR_PACK")).toBe(false);
    if (prev === undefined) delete process.env.NELVYON_INFLUENCERS_PR_PACK;
    else process.env.NELVYON_INFLUENCERS_PR_PACK = prev;
  });
});
