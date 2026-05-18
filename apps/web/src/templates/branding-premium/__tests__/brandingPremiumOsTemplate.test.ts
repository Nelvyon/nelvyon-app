import { describe, expect, it } from "vitest";

import { brandingPremiumNelvyonDemoProject } from "@/templates/branding-premium/demo";
import { BRANDING_PREMIUM_PREVIEW_PATH } from "@/templates/branding-premium/paths";
import { BRANDING_PREMIUM_DELIVERY_ITEMS } from "@/templates/branding-premium/checklist";
import { buildBrandingPremiumMetadata } from "@/templates/branding-premium/seo";

describe("Branding Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildBrandingPremiumMetadata(brandingPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(brandingPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(brandingPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers deliverable sections", () => {
    const mods = new Set(brandingPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("visual_identity")).toBe(true);
    expect(mods.has("typography")).toBe(true);
    expect(mods.has("color")).toBe(true);
    expect(mods.has("voice")).toBe(true);
    expect(mods.has("applications")).toBe(true);
    expect(mods.has("brandbook")).toBe(true);
    const flat = brandingPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const itemBlob = flat.map((i) => i.label.toLowerCase()).join(" ");
    const sectionBlob = brandingPremiumNelvyonDemoProject.sections.map((s) => `${s.title} ${s.intro ?? ""}`).join(" ").toLowerCase();
    expect(itemBlob.includes("logotipo") || itemBlob.includes("logo")).toBe(true);
    expect(sectionBlob.includes("paleta") || itemBlob.includes("hex")).toBe(true);
    expect(sectionBlob.includes("tipografía") || itemBlob.includes("tipograf")).toBe(true);
    expect(sectionBlob.includes("tono") || sectionBlob.includes("voz")).toBe(true);
    expect(itemBlob.includes("brandbook")).toBe(true);
  });

  it("delivery checklist aligns with branding_premium_v1 runbook and DS v2", () => {
    expect(BRANDING_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(11);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(BRANDING_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = BRANDING_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("/app/branding/policy")).toBe(true);
    expect(blob.includes("/app/branding/preview-v2")).toBe(true);
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/i18n")).toBe(true);
    expect(blob.includes("/os/tenants/activation")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(BRANDING_PREMIUM_PREVIEW_PATH.startsWith("/os/")).toBe(true);
  });
});
