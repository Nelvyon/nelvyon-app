import { describe, expect, it } from "vitest";

import { disenoGraficoPremiumNelvyonDemoProject } from "@/templates/diseno-grafico-premium/demo";
import { DISENO_GRAFICO_PREMIUM_PREVIEW_PATH } from "@/templates/diseno-grafico-premium/paths";
import { DISENO_PREMIUM_DELIVERY_ITEMS } from "@/templates/diseno-grafico-premium/checklist";
import { buildDisenoPremiumMetadata } from "@/templates/diseno-grafico-premium/seo";

describe("Diseño gráfico y creatividades Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildDisenoPremiumMetadata(disenoGraficoPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(disenoGraficoPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(disenoGraficoPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and format badges", () => {
    const mods = new Set(disenoGraficoPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("briefing_concept")).toBe(true);
    expect(mods.has("sketches_proposals")).toBe(true);
    expect(mods.has("design_composition")).toBe(true);
    expect(mods.has("review_feedback")).toBe(true);
    expect(mods.has("adaptations_formats")).toBe(true);
    expect(mods.has("delivery")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = disenoGraficoPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const formats = new Set(flat.flatMap((i) => i.formats ?? []));
    expect(formats.has("banner_digital")).toBe(true);
    expect(formats.has("flyer")).toBe(true);
    expect(formats.has("cartel")).toBe(true);
    expect(formats.has("infografia")).toBe(true);
    expect(formats.has("presentacion")).toBe(true);
    expect(formats.has("packaging")).toBe(true);
    expect(formats.has("creatividad_ads")).toBe(true);
    expect(formats.has("post_social")).toBe(true);
    expect(formats.has("kit_brand")).toBe(true);
    expect(flat.some((i) => (i.formats?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with diseno_grafico_creatividades_premium_v1 runbook and DS v2", () => {
    expect(DISENO_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(16);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(DISENO_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = DISENO_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/web-premium")).toBe(true);
    expect(blob.includes("/os/branding-premium")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(DISENO_GRAFICO_PREMIUM_PREVIEW_PATH).toBe("/os/diseno-grafico-premium/preview");
  });
});
