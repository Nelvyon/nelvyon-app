import { describe, expect, it } from "vitest";

import { personalDigitalPremiumNelvyonDemoProject } from "@/templates/personal-digital-premium/demo";
import { PERSONAL_DIGITAL_PREMIUM_PREVIEW_PATH } from "@/templates/personal-digital-premium/paths";
import { PERSONAL_DIGITAL_PREMIUM_DELIVERY_ITEMS } from "@/templates/personal-digital-premium/checklist";
import { buildPersonalDigitalPremiumMetadata } from "@/templates/personal-digital-premium/seo";

describe("Personal Digital Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildPersonalDigitalPremiumMetadata(personalDigitalPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(personalDigitalPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(personalDigitalPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars", () => {
    const mods = new Set(personalDigitalPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("profile_presence")).toBe(true);
    expect(mods.has("personal_web")).toBe(true);
    expect(mods.has("professional_networks")).toBe(true);
    expect(mods.has("personal_content")).toBe(true);
    expect(mods.has("reputation_visibility")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = personalDigitalPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const blob = flat.map((i) => i.evidence.toLowerCase()).join(" ");
    expect(blob.includes("linkedin") || blob.includes("/app/")).toBe(true);
    expect(blob.includes("reputación") || blob.includes("/help") || blob.includes("búsqueda")).toBe(true);
  });

  it("delivery checklist aligns with personal_digital_premium_v1 runbook and DS v2", () => {
    expect(PERSONAL_DIGITAL_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(12);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(PERSONAL_DIGITAL_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = PERSONAL_DIGITAL_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("/app/branding")).toBe(true);
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/web-premium")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(PERSONAL_DIGITAL_PREMIUM_PREVIEW_PATH).toBe("/os/personal-digital-premium/preview");
  });
});
