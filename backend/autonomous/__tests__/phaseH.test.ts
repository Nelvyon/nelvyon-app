import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildPhaseHPublishPayload, buildQaReport } from "../publish/buildPhaseHPublishPayload";
import { runPlaywrightStagingQa, CRITICAL_PLACEHOLDER_PATTERNS, stagingQaBlocksPublish } from "../qa/playwrightStagingQa";
import { renderLandingPreviewHtml } from "../preview/renderLandingPreviewHtml";
import { buildLandingStagingIsolated } from "../wrappers/landingBuilderStaging";
import { loadRestaurantPilotBrief, runRestaurantLandingPhaseH } from "../pilots/restaurantLandingPhaseH";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "..", "fixtures", "restaurant-landing-pilot.json");

function sampleCopy() {
  return {
    hero: {
      headline: "La Brasa del Raval",
      subheadline: "Cocina de brasas mediterránea en el Raval",
      cta_label: "Reservar mesa",
    },
    meta: {
      title: "La Brasa del Raval — Reserva tu mesa en Barcelona",
      description: "Menú degustación de brasas con reserva directa web y -10% vs apps de delivery en el Raval.",
    },
  };
}

describe("Phase H — landing builder staging", () => {
  it("generates valid HTML with hero, single H1, and nav links", () => {
    const brief = loadRestaurantPilotBrief();
    const result = buildLandingStagingIsolated({
      brief,
      copy: sampleCopy(),
      design: { tokens: { primary: "#B45309", secondary: "#1C1917" } },
    });

    expect(result.html).toMatch(/^<!DOCTYPE html>/i);
    expect(result.html).toContain('data-section="hero"');
    expect(result.html).toContain("data-cta");
    expect(result.html).toContain("<h1>");
    expect(result.html.match(/<h1/g)?.length).toBe(1);
    expect(result.html).toContain("data-nav-link");
    expect(result.blocks.length).toBeGreaterThanOrEqual(4);
    expect(result.build.production_deploy).toBe(false);
    expect(result.preview_metadata.phase).toBe("H");
  });

  it("assets manifest lists hero and gallery slots", () => {
    const brief = loadRestaurantPilotBrief();
    const result = buildLandingStagingIsolated({
      brief,
      copy: sampleCopy(),
      design: {},
    });
    expect(result.assets_manifest.html_file).toBe("preview.html");
    expect(result.assets_manifest.assets.some((a) => a.slot === "hero_image")).toBe(true);
  });
});

describe("Phase H — Playwright staging QA", () => {
  it("passes on staging builder HTML", async () => {
    const brief = loadRestaurantPilotBrief();
    const { html } = buildLandingStagingIsolated({
      brief,
      copy: sampleCopy(),
      design: { tokens: { primary: "#B45309", secondary: "#1C1917" } },
    });
    const qa = await runPlaywrightStagingQa(html);
    expect(qa.passed).toBe(true);
    expect(stagingQaBlocksPublish(qa)).toBe(false);
    expect(qa.checks.some((c) => c.id === "PW-H1-01" && c.passed)).toBe(true);
    expect(qa.checks.some((c) => c.id === "PW-LINKS-01" && c.passed)).toBe(true);
  });

  it("blocks on critical placeholders", async () => {
    const badHtml = renderLandingPreviewHtml({
      brief: { company_name: "Test", primary_cta: "Reservar", value_proposition: "Your headline here demo" },
      copy: {
        hero: { headline: "Your headline here", subheadline: "Supporting text", cta_label: "Get started" },
        meta: { title: "Test Restaurant — Reserva mesa Barcelona", description: "Cocina mediterránea de brasas con reserva directa en el Raval de Barcelona." },
      },
      design: {},
    });
    const qa = await runPlaywrightStagingQa(badHtml);
    expect(qa.checks.find((c) => c.id === "PW-PLACEHOLDER-01")?.passed).toBe(false);
    expect(stagingQaBlocksPublish(qa)).toBe(true);
    expect(CRITICAL_PLACEHOLDER_PATTERNS.some((p) => p.test("Your headline here"))).toBe(true);
  });
});

describe("Phase H — OS handoff payload", () => {
  it("OsPublishPayload includes preview metadata and dry_run by default", () => {
    const brief = JSON.parse(readFileSync(FIXTURE, "utf-8")) as Record<string, unknown>;
    const staging = buildLandingStagingIsolated({
      brief,
      copy: sampleCopy(),
      design: {},
    });
    const project = {
      project_id: "phase-h-test",
      sku: "NELVYON-LANDING" as const,
      tier: "professional" as const,
      brief,
      os_refs: { client_id: "c1", project_slug: "TEST", workspace_id: "1" },
      artifacts: { build: staging.build, copy: sampleCopy() },
      agent_log: [],
      retry_count: 0,
      simulation_mode: "phase-h",
      status: "OS_PUBLISH_READY" as const,
      qa: { score: 90, passed: true, threshold: 85, sku: "NELVYON-LANDING" as const, dimensions: {}, blocking_failures: [], warnings: [], failed_agents: [], retry_recommendation: null, evaluated_at: "", artifact_versions: {}, checks: [] },
    };
    const qaReport = buildQaReport({
      offline_score: 90,
      staging_qa: { passed: true, checks: [], mode: "dom-parse", blocking_failures: [], score: 95 },
      passed: true,
    });
    const payload = buildPhaseHPublishPayload(project, {
      preview_metadata: staging.preview_metadata,
      qa_report: qaReport,
      assets_manifest: staging.assets_manifest,
    });

    expect(payload.dry_run).toBe(true);
    expect(payload.sku).toBe("landing");
    expect(payload.artifacts?.preview_metadata).toBeDefined();
    expect(payload.artifacts?.qa_report).toBeDefined();
    expect(payload.artifacts?.assets_manifest).toBeDefined();
    expect(payload.deliverables.every((d) => d.visibility === "internal" || d.visibility === "client")).toBe(true);
    expect(payload.note).toContain("Phase H");
  });
});

describe("Phase H — full pipeline", () => {
  it("runs end-to-end and writes preview outputs", async () => {
    const result = await runRestaurantLandingPhaseH({
      output_dir: join(__dirname, "..", "output", "phase-h-test"),
    });
    expect(result.qa_passed).toBe(true);
    expect(result.qa_score).toBeGreaterThanOrEqual(85);
    expect(result.os_publish.dry_run).toBe(true);
    expect(result.preview_html.length).toBeGreaterThan(500);
    expect(result.os_publish.artifacts?.preview_metadata).toMatchObject({ phase: "H" });
  }, 60_000);
});
