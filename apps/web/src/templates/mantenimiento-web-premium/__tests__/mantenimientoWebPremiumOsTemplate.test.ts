import { describe, expect, it } from "vitest";

import { mantenimientoWebPremiumNelvyonDemoProject } from "@/templates/mantenimiento-web-premium/demo";
import { MANTENIMIENTO_WEB_PREMIUM_PREVIEW_PATH } from "@/templates/mantenimiento-web-premium/paths";
import { MANTENIMIENTO_PREMIUM_DELIVERY_ITEMS } from "@/templates/mantenimiento-web-premium/checklist";
import { buildMantenimientoPremiumMetadata } from "@/templates/mantenimiento-web-premium/seo";

describe("Mantenimiento web Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildMantenimientoPremiumMetadata(mantenimientoWebPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(mantenimientoWebPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(mantenimientoWebPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and type badges", () => {
    const mods = new Set(mantenimientoWebPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("initial_audit")).toBe(true);
    expect(mods.has("updates_patches")).toBe(true);
    expect(mods.has("backups_recovery")).toBe(true);
    expect(mods.has("security_hardening")).toBe(true);
    expect(mods.has("performance_cwv")).toBe(true);
    expect(mods.has("uptime_monitoring")).toBe(true);
    expect(mods.has("monthly_reporting")).toBe(true);
    const flat = mantenimientoWebPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const types = new Set(flat.flatMap((i) => i.types ?? []));
    expect(types.has("actualizaciones")).toBe(true);
    expect(types.has("backups")).toBe(true);
    expect(types.has("seguridad")).toBe(true);
    expect(types.has("rendimiento")).toBe(true);
    expect(types.has("uptime")).toBe(true);
    expect(types.has("seo_tecnico")).toBe(true);
    expect(types.has("soporte")).toBe(true);
    expect(types.has("reporting")).toBe(true);
    expect(flat.some((i) => (i.types?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with mantenimiento_web_premium_v1 runbook and DS v2", () => {
    expect(MANTENIMIENTO_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(16);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(MANTENIMIENTO_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = MANTENIMIENTO_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/observability")).toBe(true);
    expect(blob.includes("/os/observability/incidents")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(MANTENIMIENTO_WEB_PREMIUM_PREVIEW_PATH).toBe("/os/mantenimiento-web-premium/preview");
  });
});
