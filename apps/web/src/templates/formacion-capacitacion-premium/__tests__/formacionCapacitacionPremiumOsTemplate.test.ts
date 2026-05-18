import { describe, expect, it } from "vitest";

import { formacionCapacitacionPremiumNelvyonDemoProject } from "@/templates/formacion-capacitacion-premium/demo";
import { FORMACION_CAPACITACION_PREMIUM_PREVIEW_PATH } from "@/templates/formacion-capacitacion-premium/paths";
import { FORMACION_PREMIUM_DELIVERY_ITEMS } from "@/templates/formacion-capacitacion-premium/checklist";
import { buildFormacionPremiumMetadata } from "@/templates/formacion-capacitacion-premium/seo";

describe("Formación y capacitación digital Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildFormacionPremiumMetadata(formacionCapacitacionPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(formacionCapacitacionPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(formacionCapacitacionPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and type badges", () => {
    const mods = new Set(formacionCapacitacionPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("needs_diagnosis")).toBe(true);
    expect(mods.has("curriculum_design")).toBe(true);
    expect(mods.has("materials_resources")).toBe(true);
    expect(mods.has("delivery_instruction")).toBe(true);
    expect(mods.has("evaluation_feedback")).toBe(true);
    expect(mods.has("certification")).toBe(true);
    expect(mods.has("reporting_followup")).toBe(true);
    const flat = formacionCapacitacionPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const types = new Set(flat.flatMap((i) => i.types ?? []));
    expect(types.has("taller_presencial")).toBe(true);
    expect(types.has("curso_online")).toBe(true);
    expect(types.has("mentoria")).toBe(true);
    expect(types.has("webinar")).toBe(true);
    expect(types.has("manual_tecnico")).toBe(true);
    expect(types.has("onboarding_herramienta")).toBe(true);
    expect(types.has("programa_continuo")).toBe(true);
    expect(flat.some((i) => (i.types?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with formacion_capacitacion_digital_premium_v1 runbook and DS v2", () => {
    expect(FORMACION_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(15);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(FORMACION_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = FORMACION_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/advisor-empresarial-premium")).toBe(true);
    expect(blob.includes("/help")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(FORMACION_CAPACITACION_PREMIUM_PREVIEW_PATH).toBe("/os/formacion-capacitacion-premium/preview");
  });
});
