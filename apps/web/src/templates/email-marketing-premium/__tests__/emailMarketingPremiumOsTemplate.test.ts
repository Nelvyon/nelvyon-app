import { describe, expect, it } from "vitest";

import { emailMarketingPremiumNelvyonDemoProject } from "@/templates/email-marketing-premium/demo";
import { EMAIL_MARKETING_PREMIUM_PREVIEW_PATH } from "@/templates/email-marketing-premium/paths";
import { EMAIL_MARKETING_PREMIUM_DELIVERY_ITEMS } from "@/templates/email-marketing-premium/checklist";
import { buildEmailMarketingPremiumMetadata } from "@/templates/email-marketing-premium/seo";

describe("Email Marketing Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildEmailMarketingPremiumMetadata(emailMarketingPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(emailMarketingPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(emailMarketingPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and email type badges", () => {
    const mods = new Set(emailMarketingPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("strategy_segmentation")).toBe(true);
    expect(mods.has("design_templates")).toBe(true);
    expect(mods.has("copy_subjects")).toBe(true);
    expect(mods.has("automations_flows")).toBe(true);
    expect(mods.has("deliverability_reputation")).toBe(true);
    expect(mods.has("metrics_reporting")).toBe(true);
    const flat = emailMarketingPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const kinds = new Set(flat.flatMap((i) => i.emailKinds ?? []));
    expect(kinds.has("newsletter")).toBe(true);
    expect(kinds.has("campaign")).toBe(true);
    expect(kinds.has("automation")).toBe(true);
    expect(kinds.has("transactional")).toBe(true);
    expect(kinds.has("nurturing")).toBe(true);
    expect(flat.some((i) => (i.emailKinds?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with email_marketing_premium_v1 runbook and DS v2", () => {
    expect(EMAIL_MARKETING_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(13);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(EMAIL_MARKETING_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = EMAIL_MARKETING_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/app/communications") || blob.includes("communications")).toBe(true);
    expect(blob.includes("/automations")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(EMAIL_MARKETING_PREMIUM_PREVIEW_PATH).toBe("/os/email-marketing-premium/preview");
  });
});
