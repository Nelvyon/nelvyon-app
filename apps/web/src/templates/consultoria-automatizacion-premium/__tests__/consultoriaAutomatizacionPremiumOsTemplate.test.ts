import { describe, expect, it } from "vitest";

import { consultoriaAutomatizacionPremiumNelvyonDemoProject } from "@/templates/consultoria-automatizacion-premium/demo";
import { CONSULTORIA_AUTOMATIZACION_PREMIUM_PREVIEW_PATH } from "@/templates/consultoria-automatizacion-premium/paths";
import { AUTOMATIZACION_PREMIUM_DELIVERY_ITEMS } from "@/templates/consultoria-automatizacion-premium/checklist";
import { buildAutomatizacionPremiumMetadata } from "@/templates/consultoria-automatizacion-premium/seo";

describe("Consultoría de automatización Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildAutomatizacionPremiumMetadata(consultoriaAutomatizacionPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(consultoriaAutomatizacionPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(consultoriaAutomatizacionPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and type badges", () => {
    const mods = new Set(consultoriaAutomatizacionPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("process_diagnosis")).toBe(true);
    expect(mods.has("flow_map")).toBe(true);
    expect(mods.has("automation_design")).toBe(true);
    expect(mods.has("implementation")).toBe(true);
    expect(mods.has("testing_validation")).toBe(true);
    expect(mods.has("documentation")).toBe(true);
    expect(mods.has("reporting_metrics")).toBe(true);
    const flat = consultoriaAutomatizacionPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const types = new Set(flat.flatMap((i) => i.types ?? []));
    expect(types.has("workflow")).toBe(true);
    expect(types.has("webhook")).toBe(true);
    expect(types.has("crm_automation")).toBe(true);
    expect(types.has("email_sequence")).toBe(true);
    expect(types.has("lead_scoring")).toBe(true);
    expect(types.has("reporting_auto")).toBe(true);
    expect(types.has("integration_flow")).toBe(true);
    expect(flat.some((i) => (i.types?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with consultoria_automatizacion_premium_v1 runbook and DS v2", () => {
    expect(AUTOMATIZACION_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(15);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(AUTOMATIZACION_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = AUTOMATIZACION_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/automations/jobs")).toBe(true);
    expect(blob.includes("/automations/webhooks")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(CONSULTORIA_AUTOMATIZACION_PREMIUM_PREVIEW_PATH).toBe("/os/consultoria-automatizacion-premium/preview");
  });
});
