import { describe, expect, it } from "vitest";

import { integracionesApisPremiumNelvyonDemoProject } from "@/templates/integraciones-apis-premium/demo";
import { INTEGRACIONES_APIS_PREMIUM_PREVIEW_PATH } from "@/templates/integraciones-apis-premium/paths";
import { INTEGRACION_PREMIUM_DELIVERY_ITEMS } from "@/templates/integraciones-apis-premium/checklist";
import { buildIntegracionPremiumMetadata } from "@/templates/integraciones-apis-premium/seo";

describe("Integraciones y APIs Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildIntegracionPremiumMetadata(integracionesApisPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(integracionesApisPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(integracionesApisPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and type badges", () => {
    const mods = new Set(integracionesApisPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("analysis_design")).toBe(true);
    expect(mods.has("auth_security")).toBe(true);
    expect(mods.has("development_implementation")).toBe(true);
    expect(mods.has("testing_qa")).toBe(true);
    expect(mods.has("technical_documentation")).toBe(true);
    expect(mods.has("monitoring")).toBe(true);
    expect(mods.has("delivery_handoff")).toBe(true);
    const flat = integracionesApisPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const types = new Set(flat.flatMap((i) => i.types ?? []));
    expect(types.has("rest_api")).toBe(true);
    expect(types.has("webhook")).toBe(true);
    expect(types.has("crm_sync")).toBe(true);
    expect(types.has("payment_gateway")).toBe(true);
    expect(types.has("erp_sync")).toBe(true);
    expect(types.has("oauth")).toBe(true);
    expect(types.has("third_party_sdk")).toBe(true);
    expect(types.has("data_pipeline")).toBe(true);
    expect(flat.some((i) => (i.types?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with integraciones_apis_premium_v1 runbook and DS v2", () => {
    expect(INTEGRACION_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(16);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(INTEGRACION_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = INTEGRACION_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/automations/webhooks")).toBe(true);
    expect(blob.includes("/os/observability")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(INTEGRACIONES_APIS_PREMIUM_PREVIEW_PATH).toBe("/os/integraciones-apis-premium/preview");
  });
});
