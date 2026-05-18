import { describe, expect, it } from "vitest";

import { seoPremiumNelvyonDemoAudit } from "@/templates/seo-premium/demo";
import { SEO_PREMIUM_PREVIEW_PATH } from "@/templates/seo-premium/paths";
import { SEO_PREMIUM_DELIVERY_ITEMS } from "@/templates/seo-premium/checklist";
import { buildSEOPremiumMetadata } from "@/templates/seo-premium/seo";

describe("SEO Premium OS template", () => {
  it("builds page metadata from audit config", () => {
    const meta = buildSEOPremiumMetadata(seoPremiumNelvyonDemoAudit.pageSeo);
    expect(meta.title).toBe(seoPremiumNelvyonDemoAudit.pageSeo.title);
    expect(meta.openGraph?.title).toBe(seoPremiumNelvyonDemoAudit.pageSeo.title);
  });

  it("demo audit covers required SEO pillars", () => {
    const modules = new Set(seoPremiumNelvyonDemoAudit.sections.map((s) => s.module));
    expect(modules.has("technical")).toBe(true);
    expect(modules.has("on_page")).toBe(true);
    expect(modules.has("content")).toBe(true);
    expect(modules.has("interlinking")).toBe(true);
    expect(modules.has("cwv")).toBe(true);
    expect(modules.has("reporting")).toBe(true);
    const flat = seoPremiumNelvyonDemoAudit.sections.flatMap((s) => s.items);
    const labels = flat.map((i) => i.label.toLowerCase()).join(" ");
    const sectionTitles = seoPremiumNelvyonDemoAudit.sections.map((s) => s.title.toLowerCase()).join(" ");
    expect(labels.includes("canonical")).toBe(true);
    expect(labels.includes("sitemap")).toBe(true);
    expect(labels.includes("robot")).toBe(true);
    expect(labels.includes("schema")).toBe(true);
    expect(sectionTitles.includes("web vitals")).toBe(true);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
  });

  it("delivery checklist aligns with seo_premium_v1 runbook and DS v2", () => {
    expect(SEO_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(11);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(SEO_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = SEO_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("/os/i18n")).toBe(true);
    expect(blob.includes("/app/branding/policy")).toBe(true);
    expect(blob.includes("/os/observability")).toBe(true);
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(SEO_PREMIUM_PREVIEW_PATH.startsWith("/os/")).toBe(true);
  });
});
