import { describe, expect, it } from "vitest";

import { advisorPremiumNelvyonDemoProject } from "@/templates/advisor-empresarial-premium/demo";
import { ADVISOR_EMPRESARIAL_PREMIUM_PREVIEW_PATH } from "@/templates/advisor-empresarial-premium/paths";
import { ADVISOR_PREMIUM_DELIVERY_ITEMS } from "@/templates/advisor-empresarial-premium/checklist";
import { buildAdvisorPremiumMetadata } from "@/templates/advisor-empresarial-premium/seo";

describe("Advisor Empresarial Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildAdvisorPremiumMetadata(advisorPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(advisorPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(advisorPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars", () => {
    const mods = new Set(advisorPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("diagnosis_initial")).toBe(true);
    expect(mods.has("strategy")).toBe(true);
    expect(mods.has("action_plan")).toBe(true);
    expect(mods.has("kpi_metrics")).toBe(true);
    expect(mods.has("followup_review")).toBe(true);
    expect(mods.has("deliverables_reporting")).toBe(true);
    const flat = advisorPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const evidBlob = flat.map((i) => i.evidence.toLowerCase()).join(" ");
    const labelBlob = flat.map((i) => i.label.toLowerCase()).join(" ");
    expect(evidBlob.includes("/app/advisor") || labelBlob.includes("advisor")).toBe(true);
    expect(
      evidBlob.includes("kpi") || labelBlob.includes("kpi") || evidBlob.includes("indicador") || labelBlob.includes("métricas"),
    ).toBe(true);
    expect(evidBlob.includes("entreg") || labelBlob.includes("entreg")).toBe(true);
  });

  it("delivery checklist aligns with advisor_empresarial_premium_v1 runbook and DS v2", () => {
    expect(ADVISOR_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(12);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(ADVISOR_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = ADVISOR_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("/app/advisor")).toBe(true);
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("golden")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(ADVISOR_EMPRESARIAL_PREMIUM_PREVIEW_PATH).toBe("/os/advisor-empresarial-premium/preview");
  });
});
