import { describe, expect, it } from "vitest";

import { reputacionOrmPremiumNelvyonDemoProject } from "@/templates/reputacion-orm-premium/demo";
import { REPUTACION_ORM_PREMIUM_PREVIEW_PATH } from "@/templates/reputacion-orm-premium/paths";
import { ORM_PREMIUM_DELIVERY_ITEMS } from "@/templates/reputacion-orm-premium/checklist";
import { buildOrmPremiumMetadata } from "@/templates/reputacion-orm-premium/seo";

describe("Reputación online y ORM Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildOrmPremiumMetadata(reputacionOrmPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(reputacionOrmPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(reputacionOrmPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and type badges", () => {
    const mods = new Set(reputacionOrmPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("reputation_audit")).toBe(true);
    expect(mods.has("review_management")).toBe(true);
    expect(mods.has("positive_content")).toBe(true);
    expect(mods.has("negative_suppression")).toBe(true);
    expect(mods.has("continuous_monitoring")).toBe(true);
    expect(mods.has("crisis_management")).toBe(true);
    expect(mods.has("monthly_reporting")).toBe(true);
    const flat = reputacionOrmPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const types = new Set(flat.flatMap((i) => i.types ?? []));
    expect(types.has("auditoria_reputacion")).toBe(true);
    expect(types.has("gestion_resenas")).toBe(true);
    expect(types.has("contenido_positivo")).toBe(true);
    expect(types.has("supresion_negativo")).toBe(true);
    expect(types.has("monitorizacion_marca")).toBe(true);
    expect(types.has("crisis_management")).toBe(true);
    expect(types.has("reporting")).toBe(true);
    expect(flat.some((i) => (i.types?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with reputacion_online_orm_premium_v1 runbook and DS v2", () => {
    expect(ORM_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(15);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(ORM_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = ORM_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/seo-premium")).toBe(true);
    expect(blob.includes("/os/contenido-copywriting-premium")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(REPUTACION_ORM_PREMIUM_PREVIEW_PATH).toBe("/os/reputacion-orm-premium/preview");
  });
});
