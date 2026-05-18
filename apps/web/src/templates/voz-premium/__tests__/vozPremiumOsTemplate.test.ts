import { describe, expect, it } from "vitest";

import { vozPremiumNelvyonDemoProject } from "@/templates/voz-premium/demo";
import { VOZ_PREMIUM_PREVIEW_PATH } from "@/templates/voz-premium/paths";
import { VOZ_PREMIUM_DELIVERY_ITEMS } from "@/templates/voz-premium/checklist";
import { buildVozPremiumMetadata } from "@/templates/voz-premium/seo";

describe("Voz Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildVozPremiumMetadata(vozPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(vozPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(vozPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers voice delivery pillars", () => {
    const mods = new Set(vozPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("agent_config")).toBe(true);
    expect(mods.has("voice_quality")).toBe(true);
    expect(mods.has("script_flow")).toBe(true);
    expect(mods.has("localization")).toBe(true);
    expect(mods.has("handoff")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = vozPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const blob = flat.map((i) => i.label.toLowerCase()).join(" ");
    expect(blob.includes("guión") || blob.includes("human")).toBe(true);
    expect(blob.includes("idioma") || blob.includes("i18n")).toBe(true);
  });

  it("delivery checklist aligns with voz_premium_v1 runbook and DS v2", () => {
    expect(VOZ_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(11);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(VOZ_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = VOZ_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("/app/voz")).toBe(true);
    expect(blob.includes("inbound")).toBe(true);
    expect(blob.includes("outbound")).toBe(true);
    expect(blob.includes("/os/observability")).toBe(true);
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(VOZ_PREMIUM_PREVIEW_PATH).toBe("/os/voz-premium/preview");
  });
});
