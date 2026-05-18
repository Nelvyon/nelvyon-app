import { describe, expect, it } from "vitest";

import { adsPremiumNelvyonDemoCampaign } from "@/templates/ads-premium/demo";
import { ADS_PREMIUM_PREVIEW_PATH } from "@/templates/ads-premium/paths";
import { ADS_PREMIUM_DELIVERY_ITEMS } from "@/templates/ads-premium/checklist";
import { buildAdsPremiumMetadata } from "@/templates/ads-premium/seo";

describe("Ads Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildAdsPremiumMetadata(adsPremiumNelvyonDemoCampaign.pageSeo);
    expect(meta.title).toBe(adsPremiumNelvyonDemoCampaign.pageSeo.title);
    expect(meta.openGraph?.title).toBe(adsPremiumNelvyonDemoCampaign.pageSeo.title);
  });

  it("demo campaign covers modules and channels", () => {
    const mods = new Set(adsPremiumNelvyonDemoCampaign.sections.map((s) => s.module));
    expect(mods.has("tracking")).toBe(true);
    expect(mods.has("creatives")).toBe(true);
    expect(mods.has("copy")).toBe(true);
    expect(mods.has("segmentation")).toBe(true);
    expect(mods.has("budget")).toBe(true);
    expect(mods.has("optimization")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const ch = adsPremiumNelvyonDemoCampaign.channels.map((c) => c.channel);
    expect(ch.includes("google_ads")).toBe(true);
    expect(ch.includes("meta_ads")).toBe(true);
    expect(ch.includes("other")).toBe(true);
    const flat = adsPremiumNelvyonDemoCampaign.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
  });

  it("delivery checklist aligns with ads_premium_v1 runbook and DS v2", () => {
    expect(ADS_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(12);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(ADS_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = ADS_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/observability")).toBe(true);
    expect(blob.includes("/os/global/risk-queue")).toBe(true);
    expect(blob.includes("/app/branding/policy")).toBe(true);
    expect(blob.includes("request_id")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(ADS_PREMIUM_PREVIEW_PATH.startsWith("/os/")).toBe(true);
  });
});
