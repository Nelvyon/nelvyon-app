import { describe, expect, it } from "vitest";

import {
  ADS_FEATURED_PRESET,
  buildAdsBriefingFromPreset,
  listAdsElitePresets,
} from "@/lib/eliteTemplates/adsTemplates";
import {
  buildEmailCampaignFromPreset,
  EMAIL_FEATURED_PRESET,
  listEmailElitePresets,
} from "@/lib/eliteTemplates/emailTemplates";
import {
  buildFunnelCreatePayload,
  FUNNEL_FEATURED_PRESET,
  listFunnelElitePresets,
} from "@/lib/eliteTemplates/funnelTemplates";

describe("adsEliteTemplates", () => {
  it("lists presets for each sector group", () => {
    expect(listAdsElitePresets("local").length).toBeGreaterThanOrEqual(3);
    expect(listAdsElitePresets("ecommerce").length).toBeGreaterThanOrEqual(2);
    expect(listAdsElitePresets("saas_b2b").length).toBeGreaterThanOrEqual(2);
  });

  it("builds briefing with launch flag", () => {
    const briefing = buildAdsBriefingFromPreset(ADS_FEATURED_PRESET, true);
    expect(briefing.launch).toBe(true);
    expect(briefing.product).toBe("Moda Nova");
    expect(briefing.notes).toContain("ads-meta-advantage-ecom-v1");
  });
});

describe("emailEliteTemplates", () => {
  it("lists presets for each sector group", () => {
    expect(listEmailElitePresets("local").length).toBeGreaterThanOrEqual(3);
    expect(listEmailElitePresets("ecommerce").length).toBeGreaterThanOrEqual(2);
    expect(listEmailElitePresets("saas_b2b").length).toBeGreaterThanOrEqual(2);
  });

  it("builds campaign payload with sequence content", () => {
    const payload = buildEmailCampaignFromPreset(EMAIL_FEATURED_PRESET, 42);
    expect(payload.platform).toBe("email");
    expect(payload.project_id).toBe(42);
    expect(payload.content).toContain("email-cart-abandon-v1");
    expect(payload.content).toContain("D+0");
  });
});

describe("funnelEliteTemplates", () => {
  it("featured preset has 4 steps", () => {
    expect(FUNNEL_FEATURED_PRESET.steps).toHaveLength(4);
  });

  it("builds create payload with metadata", () => {
    const payload = buildFunnelCreatePayload(FUNNEL_FEATURED_PRESET);
    expect(payload.status).toBe("active");
    expect(payload.metadata?.elite_template_id).toBe("funnel-ads-landing-crm-v1");
    expect(payload.steps.length).toBe(4);
  });

  it("covers pack-related sector groups", () => {
    const all = [
      ...listFunnelElitePresets("local"),
      ...listFunnelElitePresets("ecommerce"),
      ...listFunnelElitePresets("saas_b2b"),
    ];
    expect(all.length).toBeGreaterThanOrEqual(5);
  });
});
