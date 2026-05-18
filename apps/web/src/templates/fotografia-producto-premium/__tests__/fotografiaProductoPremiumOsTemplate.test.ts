import { describe, expect, it } from "vitest";

import { fotografiaProductoPremiumNelvyonDemoProject } from "@/templates/fotografia-producto-premium/demo";
import { FOTOGRAFIA_PRODUCTO_PREMIUM_PREVIEW_PATH } from "@/templates/fotografia-producto-premium/paths";
import { FOTOGRAFIA_PREMIUM_DELIVERY_ITEMS } from "@/templates/fotografia-producto-premium/checklist";
import { buildFotografiaPremiumMetadata } from "@/templates/fotografia-producto-premium/seo";

describe("Fotografía de Producto Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildFotografiaPremiumMetadata(fotografiaProductoPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(fotografiaProductoPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(fotografiaProductoPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and format badges", () => {
    const mods = new Set(fotografiaProductoPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("briefing_moodboard")).toBe(true);
    expect(mods.has("session_direction")).toBe(true);
    expect(mods.has("selection_editing")).toBe(true);
    expect(mods.has("retouch_color")).toBe(true);
    expect(mods.has("web_optimization")).toBe(true);
    expect(mods.has("delivery_formats")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = fotografiaProductoPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const formats = new Set(flat.flatMap((i) => i.formats ?? []));
    expect(formats.has("pack_ecommerce")).toBe(true);
    expect(formats.has("lifestyle")).toBe(true);
    expect(formats.has("fondo_blanco")).toBe(true);
    expect(formats.has("detalle")).toBe(true);
    expect(formats.has("editorial")).toBe(true);
    expect(formats.has("360_product")).toBe(true);
    expect(formats.has("still_life")).toBe(true);
    expect(flat.some((i) => (i.formats?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with fotografia_producto_premium_v1 runbook and DS v2", () => {
    expect(FOTOGRAFIA_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(16);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(FOTOGRAFIA_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = FOTOGRAFIA_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/web-premium")).toBe(true);
    expect(blob.includes("/os/video-multimedia-premium")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(FOTOGRAFIA_PRODUCTO_PREMIUM_PREVIEW_PATH).toBe("/os/fotografia-producto-premium/preview");
  });
});
