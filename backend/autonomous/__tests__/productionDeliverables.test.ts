import { describe, expect, it, afterEach } from "vitest";

import { buildOsPublishPayload } from "../publish/osPublishPayload";
import {
  defaultProductionDeliverables,
  isAutonomousProductionPublish,
  sanitizePublishValue,
} from "../publish/productionDeliverableUrls";
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

describe("buildOsPublishPayload production", () => {
  const prev = process.env.AUTONOMOUS_PRODUCTION;

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
