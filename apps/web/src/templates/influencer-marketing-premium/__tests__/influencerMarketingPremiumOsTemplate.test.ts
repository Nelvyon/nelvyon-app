import { describe, expect, it } from "vitest";

import { influencerMarketingPremiumNelvyonDemoProject } from "@/templates/influencer-marketing-premium/demo";
import { INFLUENCER_MARKETING_PREMIUM_PREVIEW_PATH } from "@/templates/influencer-marketing-premium/paths";
import { INFLUENCER_PREMIUM_DELIVERY_ITEMS } from "@/templates/influencer-marketing-premium/checklist";
import { buildInfluencerPremiumMetadata } from "@/templates/influencer-marketing-premium/seo";

describe("Influencer Marketing Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildInfluencerPremiumMetadata(influencerMarketingPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(influencerMarketingPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(influencerMarketingPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and type badges", () => {
    const mods = new Set(influencerMarketingPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("strategy_objectives")).toBe(true);
    expect(mods.has("influencer_search_selection")).toBe(true);
    expect(mods.has("briefing_contract")).toBe(true);
    expect(mods.has("content_production")).toBe(true);
    expect(mods.has("publication_tracking")).toBe(true);
    expect(mods.has("metrics_roi")).toBe(true);
    expect(mods.has("final_reporting")).toBe(true);
    const flat = influencerMarketingPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const types = new Set(flat.flatMap((i) => i.types ?? []));
    expect(types.has("nano")).toBe(true);
    expect(types.has("micro")).toBe(true);
    expect(types.has("macro")).toBe(true);
    expect(types.has("mega")).toBe(true);
    expect(types.has("brand_ambassador")).toBe(true);
    expect(types.has("ugc_creator")).toBe(true);
    expect(types.has("celebrity")).toBe(true);
    expect(types.has("b2b_thought_leader")).toBe(true);
    expect(flat.some((i) => (i.types?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with influencer_marketing_premium_v1 runbook and DS v2", () => {
    expect(INFLUENCER_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(15);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(INFLUENCER_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = INFLUENCER_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/social-media-premium")).toBe(true);
    expect(blob.includes("/os/contenido-copywriting-premium")).toBe(true);
    expect(blob.includes("/os/ads-premium")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(INFLUENCER_MARKETING_PREMIUM_PREVIEW_PATH).toBe("/os/influencer-marketing-premium/preview");
  });
});
