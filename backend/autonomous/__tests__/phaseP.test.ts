import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  TEMPLATE_SCORE_MIN,
  detectLearningAlerts,
  type TemplateRankRow,
  type TrendPoint,
} from "../learning/learningAlerts";
import { exportLearningCsv } from "../learning/learningCsvExport";
import { runLearningRefreshJob } from "../learning/runLearningRefreshJob";
import {
  resetTemplateOutcomeStorageForTests,
  templateOutcomeRepository,
} from "../templates/templateOutcomeRepository";
import { loadOutcomesFromJson } from "../templates/templateOutcome";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_FIXTURE = join(__dirname, "..", "fixtures", "learning-outcomes-mock.json");
const TEST_OUTPUT = join(__dirname, "..", "output", "learning", "phase-p-test");

function tpl(overrides: Partial<TemplateRankRow>): TemplateRankRow {
  return {
    template_id: "landing-cro-v3",
    sector: "restaurant",
    service: "landing",
    final_template_score: 75,
    conversion_score: 70,
    qa_score: 88,
    conversion_rate: 10,
    lead_count: 20,
    approved_by_client_rate: 0.9,
    revisions_count: 0.5,
    sample_size: 5,
    ...overrides,
  };
}

describe("Phase P — learning alerts", () => {
  it("detects QA score below threshold", () => {
    const alerts = detectLearningAlerts({
      outcomes: [],
      topTemplates: [tpl({ qa_score: 72 })],
      trend: [],
    });
    expect(alerts.some((a) => a.type === "qa_score_low")).toBe(true);
    expect(alerts.find((a) => a.type === "qa_score_low")?.value).toBe(72);
  });

  it("detects conversion_rate drop from snapshot", () => {
    const alerts = detectLearningAlerts({
      outcomes: [],
      topTemplates: [tpl({ conversion_rate: 5 })],
      trend: [],
      previousSnapshot: {
        computed_at: "2026-06-01T00:00:00Z",
        templates: {
          "landing-cro-v3": { conversion_rate: 10, lead_count: 20, final_template_score: 75 },
        },
        trend_cr_avg: 10,
        trend_leads_total: 20,
      },
    });
    expect(alerts.some((a) => a.type === "conversion_rate_drop" && a.template_id === "landing-cro-v3")).toBe(
      true,
    );
  });

  it("detects template_score below 65", () => {
    const alerts = detectLearningAlerts({
      outcomes: [],
      topTemplates: [tpl({ final_template_score: 60 })],
      trend: [],
    });
    expect(alerts.some((a) => a.type === "template_score_low")).toBe(true);
    expect(alerts.find((a) => a.type === "template_score_low")?.threshold).toBe(TEMPLATE_SCORE_MIN);
  });

  it("detects global CR drop from trend weeks", () => {
    const trend: TrendPoint[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date("2026-05-01T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + i);
      trend.push({
        date: d.toISOString().slice(0, 10),
        outcomes_count: 2,
        conversion_rate_avg: i < 7 ? 12 : 8,
        lead_count_total: 10,
      });
    }
    const alerts = detectLearningAlerts({
      outcomes: [],
      topTemplates: [],
      trend,
    });
    expect(alerts.some((a) => a.type === "conversion_rate_drop" && !a.template_id)).toBe(true);
  });
});

describe("Phase P — CSV export", () => {
  afterEach(() => {
    if (existsSync(TEST_OUTPUT)) rmSync(TEST_OUTPUT, { recursive: true, force: true });
  });

  it("writes valid rankings.csv with headers", () => {
    const mock = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8"))).slice(0, 2);
    const result = exportLearningCsv({
      topTemplates: [
        tpl({ template_id: "landing-cro-v3" }),
        tpl({ template_id: "landing-hero-split", sector: "dental" }),
      ],
      outcomes: mock,
      bySector: [
        {
          sector: "restaurant",
          top_template_id: "landing-cro-v3",
          top_final_score: 79,
          avg_conversion_score: 72,
          templates_count: 1,
        },
      ],
      outputDir: TEST_OUTPUT,
    });
    expect(existsSync(result.rankings_path)).toBe(true);
    const csv = readFileSync(result.rankings_path, "utf-8");
    expect(csv.split("\n")[0]).toContain("template_id");
    expect(csv).toContain("landing-cro-v3");
    expect(existsSync(result.outcomes_path)).toBe(true);
    expect(existsSync(result.sector_summary_path)).toBe(true);
  });
});

describe("Phase P — learning refresh job", () => {
  beforeEach(() => {
    delete process.env.ENABLE_TEMPLATE_LEARNING_DB;
    resetTemplateOutcomeStorageForTests();
  });
  afterEach(() => {
    delete process.env.ENABLE_TEMPLATE_LEARNING_DB;
    resetTemplateOutcomeStorageForTests();
    if (existsSync(TEST_OUTPUT)) rmSync(TEST_OUTPUT, { recursive: true, force: true });
  });

  it("runs local fallback without DB", async () => {
    const mock = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8"))).slice(0, 3);
    for (const o of mock) {
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

    const result = await runLearningRefreshJob({
      output_dir: TEST_OUTPUT,
      export_dir: join(TEST_OUTPUT, "exports"),
      source: "manual",
    });

    expect(result.report.phase).toBe("P");
    expect(result.report.steps_completed).toContain("enrich-outcomes");
    expect(result.report.steps_completed).toContain("rank-templates");
    expect(result.report.steps_completed).toContain("exports");
    expect(existsSync(join(TEST_OUTPUT, "learningAlerts.json"))).toBe(true);
    expect(existsSync(join(TEST_OUTPUT, "refreshStatus.json"))).toBe(true);
    expect(existsSync(join(TEST_OUTPUT, "exports", "rankings.csv"))).toBe(true);
    expect(result.report.autonomy_pct.current).toBe(90);
  });
});
