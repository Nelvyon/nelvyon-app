import { describe, expect, it } from "vitest";

import { getAgentCatalogStats, OS_AGENT_CATALOG } from "@/lib/os-core/agentCatalog";
import { getConnectorStats } from "@/lib/os-core/connectorRegistry";
import { getOsCoreHealth } from "@/lib/os-core/index";
import { getPackOsBinding, PACK_OS_BINDINGS } from "@/lib/os-core/packOsBridge";
import { getProcessTemplateStats, OS_PROCESS_TEMPLATES } from "@/lib/os-core/processTemplateRegistry";
import { SERVICE_PACK_CATALOG } from "@/lib/saas/servicePacksCatalog";

describe("NELVYON OS core", () => {
  it("registers a substantial agent catalog", () => {
    const stats = getAgentCatalogStats();
    expect(stats.total).toBeGreaterThanOrEqual(30);
    expect(stats.premium).toBeGreaterThanOrEqual(24);
    expect(OS_AGENT_CATALOG.every((a) => a.inputs.length > 0)).toBe(true);
  });

  it("generates 100+ internal process templates", () => {
    const stats = getProcessTemplateStats();
    expect(stats.total).toBeGreaterThanOrEqual(100);
    expect(OS_PROCESS_TEMPLATES.every((t) => t.steps.length > 0)).toBe(true);
  });

  it("documents connectors with health stats", () => {
    const stats = getConnectorStats();
    expect(stats.total).toBeGreaterThanOrEqual(10);
    expect(stats.live).toBeGreaterThanOrEqual(2);
  });

  it("exposes OS health summary", () => {
    const health = getOsCoreHealth();
    expect(health.layer).toBe("nelvyon-os-internal");
    expect(health.processTemplates).toBeGreaterThanOrEqual(100);
  });

  it("binds every executable growth pack to OS agents", () => {
    for (const id of ["local-business-growth", "ecommerce-growth", "saas-b2b-growth"]) {
      const binding = getPackOsBinding(id);
      expect(binding?.agentIds.length).toBeGreaterThan(3);
      expect(binding?.processTemplateIds.length).toBeGreaterThan(2);
    }
    expect(Object.keys(PACK_OS_BINDINGS).length).toBeGreaterThanOrEqual(10);
  });

  it("maps SaaS catalog packs to OS bindings where available", () => {
    const withBinding = SERVICE_PACK_CATALOG.filter((p) => getPackOsBinding(p.id));
    expect(withBinding.length).toBeGreaterThanOrEqual(8);
  });
});
