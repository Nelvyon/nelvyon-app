import { describe, expect, it } from "vitest";

import { inmersivo3dPremiumNelvyonDemoProject } from "@/templates/3d-inmersivo-premium/demo";
import { INMERSIVO_3D_PREMIUM_PREVIEW_PATH } from "@/templates/3d-inmersivo-premium/paths";
import { INMERSIVO_PREMIUM_DELIVERY_ITEMS } from "@/templates/3d-inmersivo-premium/checklist";
import { buildInmersivoPremiumMetadata } from "@/templates/3d-inmersivo-premium/seo";

describe("3D y Contenido Inmersivo Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildInmersivoPremiumMetadata(inmersivo3dPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(inmersivo3dPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(inmersivo3dPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and format badges", () => {
    const mods = new Set(inmersivo3dPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("briefing_concept")).toBe(true);
    expect(mods.has("modeling_3d")).toBe(true);
    expect(mods.has("texturing_materials")).toBe(true);
    expect(mods.has("animation")).toBe(true);
    expect(mods.has("optimization_performance")).toBe(true);
    expect(mods.has("delivery_formats")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = inmersivo3dPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const formats = new Set(flat.flatMap((i) => i.formats ?? []));
    expect(formats.has("model_3d")).toBe(true);
    expect(formats.has("animation_3d")).toBe(true);
    expect(formats.has("ar_experience")).toBe(true);
    expect(formats.has("vr_experience")).toBe(true);
    expect(formats.has("product_visualizer")).toBe(true);
    expect(formats.has("interactive_scene")).toBe(true);
    expect(formats.has("motion_3d")).toBe(true);
    expect(flat.some((i) => (i.formats?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with 3d_contenido_inmersivo_premium_v1 runbook and DS v2", () => {
    expect(INMERSIVO_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(15);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(INMERSIVO_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = INMERSIVO_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/web-premium")).toBe(true);
    expect(blob.includes("/os/video-multimedia-premium")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(INMERSIVO_3D_PREMIUM_PREVIEW_PATH).toBe("/os/3d-inmersivo-premium/preview");
  });
});
