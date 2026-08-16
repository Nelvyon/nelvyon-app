import { describe, expect, it, afterEach, beforeEach } from "vitest";

import { buildOsPublishPayload } from "../publish/osPublishPayload";
import {
  defaultProductionDeliverables,
  isAutonomousProductionPublish,
  sanitizePublishValue,
} from "../publish/productionDeliverableUrls";
import { loadTemplateRegistry, getBundledTemplateRegistryCount } from "../templates/loadRegistry";
import type { AutonomousProject } from "../types";

describe("productionDeliverableUrls", () => {
  it("sanitizePublishValue replaces mock:// with fallback", () => {
    expect(sanitizePublishValue("mock://x", "https://app.nelvyon.com/a")).toBe(
      "https://app.nelvyon.com/a",
    );
    expect(sanitizePublishValue("https://live.example.com", "https://fallback")).toBe(
      "https://live.example.com",
    );
  });

  it("defaultProductionDeliverables never emits mock://", () => {
    const items = defaultProductionDeliverables(
      "NELVYON-LANDING",
      { build: { staging_url: "mock://bad" } },
      { primary_domain: "https://client.test" },
      "PRJ-001",
    );
    const blob = JSON.stringify(items);
    expect(blob.includes("mock://")).toBe(false);
    expect(items[0]?.value.startsWith("https://")).toBe(true);
  });
});

describe("loadTemplateRegistry production", () => {
  // Capturado DENTRO del hook: `process.env` es del proceso y vitest aisla
  // modulos, no procesos, asi que un valor congelado al cargar el modulo seria
  // el que dejo otro fichero del mismo worker.
  let prevNodeEnv: typeof process.env.NODE_ENV;

  beforeEach(() => {
    prevNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("uses bundled registry in production without disk", () => {
    process.env.NODE_ENV = "production";
    const reg = loadTemplateRegistry();
    expect(reg.templates.length).toBe(getBundledTemplateRegistryCount());
    expect(reg.templates.length).toBeGreaterThan(10);
  });
});

describe("buildOsPublishPayload production", () => {
  // Capturado DENTRO del hook, por el mismo motivo.
  let prev: typeof process.env.AUTONOMOUS_PRODUCTION;

  beforeEach(() => {
    prev = process.env.AUTONOMOUS_PRODUCTION;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.AUTONOMOUS_PRODUCTION;
    else process.env.AUTONOMOUS_PRODUCTION = prev;
  });

  it("uses https URLs when AUTONOMOUS_PRODUCTION=true", () => {
    process.env.AUTONOMOUS_PRODUCTION = "true";
    expect(isAutonomousProductionPublish()).toBe(true);

    const project = {
      project_id: "p1",
      sku: "NELVYON-SEO",
      brief: { primary_domain: "https://client.test", company_name: "Co" },
      artifacts: { report: { pdf_url: "mock://storage/x.pdf" } },
      os_refs: { client_id: "c1", project_slug: "SLUG-1", workspace_id: "1" },
      qa: { score: 90, passed: true },
    } as AutonomousProject;

    const payload = buildOsPublishPayload(project, { dry_run: false, production: true });
    const blob = JSON.stringify(payload.deliverables);
    expect(blob.includes("mock://")).toBe(false);
    expect(payload.deliverables.some((d) => d.value.startsWith("https://"))).toBe(true);
  });
});
