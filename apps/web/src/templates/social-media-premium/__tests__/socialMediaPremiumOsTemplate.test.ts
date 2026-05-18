import { describe, expect, it } from "vitest";

import { socialMediaPremiumNelvyonDemoProject } from "@/templates/social-media-premium/demo";
import { SOCIAL_MEDIA_PREMIUM_PREVIEW_PATH } from "@/templates/social-media-premium/paths";
import { SOCIAL_MEDIA_PREMIUM_DELIVERY_ITEMS } from "@/templates/social-media-premium/checklist";
import { buildSocialMediaPremiumMetadata } from "@/templates/social-media-premium/seo";

describe("Social Media Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildSocialMediaPremiumMetadata(socialMediaPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(socialMediaPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(socialMediaPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and platform badges", () => {
    const mods = new Set(socialMediaPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("strategy_calendar")).toBe(true);
    expect(mods.has("creative_copy")).toBe(true);
    expect(mods.has("publishing")).toBe(true);
    expect(mods.has("community_engagement")).toBe(true);
    expect(mods.has("growth_reach")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = socialMediaPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const plat = new Set(flat.flatMap((i) => i.platforms ?? []));
    expect(plat.has("instagram")).toBe(true);
    expect(plat.has("linkedin")).toBe(true);
    expect(plat.has("tiktok")).toBe(true);
    expect(plat.has("x_twitter")).toBe(true);
    expect(plat.has("facebook")).toBe(true);
    expect(plat.has("youtube")).toBe(true);
    expect(flat.some((i) => (i.platforms?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with social_media_premium_v1 runbook and DS v2", () => {
    expect(SOCIAL_MEDIA_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(13);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(SOCIAL_MEDIA_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = SOCIAL_MEDIA_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/app/branding")).toBe(true);
    expect(blob.includes("/help")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(SOCIAL_MEDIA_PREMIUM_PREVIEW_PATH).toBe("/os/social-media-premium/preview");
  });
});
