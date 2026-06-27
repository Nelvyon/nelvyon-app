import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runRankTemplatesJob, rankTemplates } from "../learning/runRankTemplatesJob";
import {
  buildPortalOutcomeInput,
  hasAutonomousProvenance,
  recordPortalLearningOutcome,
} from "../portal/portalLearningFeedback";
import { resolveConversionMetrics } from "../portal/conversionMetricsPlaceholder";
import {
  LOCAL_OUTCOMES_PATH,
  forceLocalTemplateLearningForTests,
  templateOutcomeRepository,
  learningDbEnabled,
} from "../templates/templateOutcomeRepository";
import { loadOutcomesFromJson } from "../templates/templateOutcome";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_FIXTURE = join(__dirname, "..", "fixtures", "learning-outcomes-mock.json");
const TEST_OUTPUT = join(__dirname, "..", "output", "learning", "phase-m-test");

function autonomousMeta(overrides: Record<string, unknown> = {}) {
  return {
    autonomous_provenance: true,
    template_id: "landing-cro-v3",
    sector: "restaurant",
    sku: "landing",
    qa_score: 88,
    autonomous_project_id: "proj-m-001",
    client_review_history: [],
    ...overrides,
  };
}

describe("Phase M — conversion metrics placeholder", () => {
  afterEach(() => {
    delete process.env.GA4_PROPERTY_ID;
  });

  it("returns null metrics without GA4 property", () => {
    delete process.env.GA4_PROPERTY_ID;
    const m = resolveConversionMetrics({ deliverable_id: "d-1", sector: "restaurant" });
    expect(m.conversion_rate).toBeNull();
    expect(m.lead_count).toBe(0);
    expect(m.source).toBe("none");
  });

  it("returns null metrics with GA4_PROPERTY_ID only (real flags not set)", () => {
    process.env.GA4_PROPERTY_ID = "123456";
    delete process.env.ENABLE_AUTONOMOUS_GA4;
    const m = resolveConversionMetrics();
    expect(m.conversion_rate).toBeNull();
    expect(m.lead_count).toBe(0);
    expect(m.source).toBe("none");
  });
});

describe("Phase M — portal learning feedback", () => {
  beforeEach(() => {
    forceLocalTemplateLearningForTests();
  });

  afterEach(() => {
    forceLocalTemplateLearningForTests();
  });

  it("approve on autonomous deliverable creates positive outcome", async () => {
    const input = buildPortalOutcomeInput(
      {
        id: "del-approve-1",
        workspace_id: 1,
        deliverable_metadata: autonomousMeta(),
      },
      "approve",
    );
    expect(input).not.toBeNull();
    expect(input!.approved_by_client).toBe(true);
    expect(input!.result_status).toBe("client_approved");

    const result = await recordPortalLearningOutcome(
      { id: "del-approve-1", workspace_id: 1, deliverable_metadata: autonomousMeta() },
      "approve",
    );
    expect(result.recorded).toBe(true);
    expect(result.mode).toBe("local");

    const listed = await templateOutcomeRepository.listOutcomes({ sector: "restaurant" });
    expect(listed.some((o) => o.approved_by_client && o.template_id === "landing-cro-v3")).toBe(true);
  });

  it("reject on autonomous deliverable creates negative outcome with revisions", async () => {
    const meta = autonomousMeta({
      client_review_history: [{ decision: "reject", feedback: "cambiar CTA" }],
    });
    const input = buildPortalOutcomeInput(
      { id: "del-reject-1", workspace_id: 1, deliverable_metadata: meta },
      "reject",
    );
    expect(input).not.toBeNull();
    expect(input!.approved_by_client).toBe(false);
    expect(input!.revisions_count).toBeGreaterThanOrEqual(1);
    expect(input!.result_status).toBe("client_rejected");

    await recordPortalLearningOutcome(
      { id: "del-reject-1", workspace_id: 1, deliverable_metadata: meta },
      "reject",
    );
    const listed = await templateOutcomeRepository.listOutcomes();
    const row = listed.find((o) => o.result_status === "client_rejected");
    expect(row?.approved_by_client).toBe(false);
    expect(row?.revisions_count).toBeGreaterThanOrEqual(1);
  });

  it("non-autonomous deliverable does not create outcome", async () => {
    const result = await recordPortalLearningOutcome(
      {
        id: "del-manual-1",
        workspace_id: 1,
        deliverable_metadata: { template_id: "landing-cro-v3", sector: "restaurant" },
      },
      "approve",
    );
    expect(result.recorded).toBe(false);
    expect(result.reason).toBe("not_autonomous_or_missing_template");
    expect(hasAutonomousProvenance({ template_id: "x" })).toBe(false);
  });

  it("autonomous without template_id is skipped", async () => {
    const result = await recordPortalLearningOutcome(
      {
        id: "del-no-tpl",
        workspace_id: 1,
        deliverable_metadata: { autonomous_provenance: true, sector: "restaurant", sku: "landing" },
      },
      "approve",
    );
    expect(result.recorded).toBe(false);
  });
});

describe("Phase M — rank templates job", () => {
  beforeEach(() => {
    forceLocalTemplateLearningForTests();
  });

  afterEach(() => {
    forceLocalTemplateLearningForTests();
    if (existsSync(TEST_OUTPUT)) {
      rmSync(TEST_OUTPUT, { recursive: true, force: true });
    }
  });

  it("runs without DB (local fallback) and writes rankings.json", async () => {
    delete process.env.ENABLE_TEMPLATE_LEARNING_DB;
    expect(learningDbEnabled()).toBe(false);

    const mock = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8")));
    for (const o of mock.slice(0, 3)) {
      await templateOutcomeRepository.recordOutcome({
        template_id: o.template_id,
        category: o.category,
        sector: o.sector,
        service: o.service,
        qa_score: o.qa_score,
        approved_by_client: o.approved_by_client,
        revisions_count: o.revisions_count,
        metadata: { project_ref: o.project_ref },
      });
    }

    const result = await runRankTemplatesJob({ output_dir: TEST_OUTPUT });
    expect(result.report.phase).toBe("M");
    expect(result.report.storage_mode).toBe("local");
    expect(result.report.outcomes_count).toBeGreaterThan(0);
    expect(result.report.ranked_slices).toBeGreaterThan(0);
    expect(existsSync(result.rankings_path)).toBe(true);
    expect(existsSync(result.report_path)).toBe(true);

    const rankings = JSON.parse(readFileSync(result.rankings_path, "utf-8")) as {
      slices: Array<{ ranked: Array<{ template_id: string }> }>;
    };
    expect(rankings.slices.length).toBeGreaterThan(0);
    expect(rankings.slices[0].ranked.length).toBeGreaterThan(0);

    const report = JSON.parse(readFileSync(result.report_path, "utf-8")) as {
      phase: string;
      autonomy_pct: { current: number };
    };
    expect(report.phase).toBe("M");
    expect(report.autonomy_pct.current).toBe(78);
  });

  it("rankTemplates matches rankTemplatesFromDb slice engine", async () => {
    const mock = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8")));
    const restaurant = mock.filter((o) => o.sector === "restaurant" && o.service === "landing");
    for (const o of restaurant) {
      await templateOutcomeRepository.recordOutcome({
        template_id: o.template_id,
        category: o.category,
        sector: o.sector,
        service: o.service,
        qa_score: o.qa_score,
        approved_by_client: o.approved_by_client,
        revisions_count: o.revisions_count,
        metadata: { project_ref: o.project_ref },
      });
    }
    const slice = { category: "landing" as const, sector: "restaurant", service: "landing" };
    const ranked = rankTemplates(slice, restaurant);
    const fromDb = await templateOutcomeRepository.rankTemplatesFromDb(slice);
    expect(ranked.length).toBe(fromDb.length);
    if (ranked.length > 0) {
      expect(ranked[0].template_id).toBe(fromDb[0].template_id);
    }
  });

  it("local outcomes path is used when DB disabled", async () => {
    await templateOutcomeRepository.recordOutcome({
      template_id: "landing-cro-v3",
      category: "landing",
      sector: "restaurant",
      service: "landing",
      metadata: { project_ref: "local-only" },
    });
    expect(existsSync(LOCAL_OUTCOMES_PATH)).toBe(true);
    const listed = await templateOutcomeRepository.listOutcomes();
    expect(listed.some((o) => o.project_ref === "local-only")).toBe(true);
  });
});
