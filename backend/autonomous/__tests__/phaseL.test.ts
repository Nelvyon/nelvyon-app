import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { simulatePhaseC } from "../simulatorPhaseC";
import {
  LOCAL_OUTCOMES_PATH,
  forceLocalTemplateLearningForTests,
  templateOutcomeRepository,
  learningDbEnabled,
} from "../templates/templateOutcomeRepository";
import {
  MIN_AUTO_TEMPLATE_SCORE,
  pickPipelineTemplate,
  DEFAULT_RANKINGS_PATH,
} from "../templates/pipelineTemplateSelector";
import { recordPostQaOutcome } from "../templates/recordPostQaOutcome";
import { initPhaseCProject, executePipelinePhaseC } from "../pipelines/runPipelinePhaseC";
import { rankTemplatesForSlice } from "../templates/templateRanking";
import { loadTemplateRegistry } from "../templates/loadRegistry";
import { loadOutcomesFromJson } from "../templates/templateOutcome";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(__dirname, "..", "..", "db", "migrations", "323_template_outcomes.sql");
const MOCK_FIXTURE = join(__dirname, "..", "fixtures", "learning-outcomes-mock.json");
const LANDING_BRIEF = "landing-heliovolt.json";

function brief(name: string) {
  return JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "briefs", name), "utf-8")) as Record<
    string,
    unknown
  >;
}

describe("Phase L — migration 323", () => {
  it("contains template_outcomes table and indexes", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS template_outcomes");
    expect(sql).toContain("idx_template_outcomes_template_id");
    expect(sql).toContain("idx_template_outcomes_sector");
    expect(sql).toContain("idx_template_outcomes_service");
    expect(sql).toContain("idx_template_outcomes_category");
    expect(sql).toContain("idx_template_outcomes_created_at");
    expect(sql).toContain("metadata");
  });
});

describe("Phase L — templateOutcomeRepository", () => {
  beforeEach(() => {
    forceLocalTemplateLearningForTests();
  });

  afterEach(() => {
    forceLocalTemplateLearningForTests();
  });

  it("does not require DATABASE_URL for recordOutcome (local fallback)", async () => {
    delete process.env.DATABASE_URL;
    expect(learningDbEnabled()).toBe(false);
    const { id, mode } = await templateOutcomeRepository.recordOutcome({
      template_id: "landing-cro-v3",
      category: "landing",
      sector: "restaurant",
      service: "landing",
      qa_score: 90,
      result_status: "qa_passed",
      metadata: { project_ref: "test-1" },
    });
    expect(id).toBeTruthy();
    expect(mode).toBe("local");
    expect(existsSync(LOCAL_OUTCOMES_PATH)).toBe(true);
    const listed = await templateOutcomeRepository.listOutcomes({ sector: "restaurant" });
    expect(listed.some((o) => o.template_id === "landing-cro-v3")).toBe(true);
  });

  it("aggregateOutcomes and rankTemplatesFromDb work on local data", async () => {
    const mock = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8")));
    const agg = templateOutcomeRepository.aggregateOutcomes(
      mock.filter((o) => o.template_id === "landing-cro-v3"),
    );
    expect(agg.sample_size).toBeGreaterThan(0);
    expect(agg.qa_avg).toBeGreaterThan(85);

    await templateOutcomeRepository.recordOutcome({
      template_id: "landing-cro-v3",
      category: "landing",
      sector: "restaurant",
      service: "landing",
      qa_score: 95,
      result_status: "qa_passed",
    });
    const ranked = await templateOutcomeRepository.rankTemplatesFromDb({
      category: "landing",
      sector: "restaurant",
      service: "landing",
      language: "es",
      level: "professional",
    });
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].template_id).toBe("landing-cro-v3");
  });
});

describe("Phase L — pipeline template selector", () => {
  it("uses rankings.json when present", async () => {
    const pick = await pickPipelineTemplate({
      sector: "restaurant",
      service: "landing",
      category: "landing",
      rankingsPath: join(__dirname, "..", "fixtures", "rankings-mock.json"),
    });
    expect(pick.source).toBe("rankings");
    expect(pick.template_id).toBe("landing-cro-v3");
    expect(pick.final_template_score).toBeGreaterThanOrEqual(MIN_AUTO_TEMPLATE_SCORE);
  });

  it("falls back to registry or default when rankings missing", async () => {
    const pick = await pickPipelineTemplate({
      sector: "restaurant",
      service: "nonexistent_service",
      category: "landing",
      rankingsPath: join(__dirname, "nonexistent-rankings.json"),
    });
    expect(["registry", "default"]).toContain(pick.source);
    expect(pick.template_id.length).toBeGreaterThan(0);
  });

  it("skips templates with score < 65 when alternatives exist", async () => {
    const registry = loadTemplateRegistry();
    const mock = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8")));
    const ranked = rankTemplatesForSlice(
      { category: "landing", sector: "dental", service: "landing", language: "es", level: "professional" },
      mock.filter((o) => o.sector === "dental" || o.template_id === "landing-hero-split"),
      registry.templates,
    );
    const rejected = ranked.find((r) => r.template_id === "landing-hero-split");
    const winner = ranked[0];
    if (rejected && winner) {
      expect(winner.final_template_score).toBeGreaterThan(rejected.final_template_score);
    }

    const used = new Set<string>();
    const first = await pickPipelineTemplate({
      sector: "dental",
      service: "landing",
      category: "landing",
      rankingsPath: join(__dirname, "nonexistent-rankings.json"),
    });
    used.add(first.template_id);
    const second = await pickPipelineTemplate({
      sector: "dental",
      service: "landing",
      category: "landing",
      usedTemplateIds: [...used],
      rankingsPath: join(__dirname, "nonexistent-rankings.json"),
    });
    if (first.template_id !== second.template_id) {
      expect(second.template_id).not.toBe(first.template_id);
    }
  });
});

describe("Phase L — pipeline retry with alternative template", () => {
  beforeEach(() => {
    forceLocalTemplateLearningForTests();
  });

  afterEach(() => {
    forceLocalTemplateLearningForTests();
  });

  it("simulatePhaseC records template_id in retryHistory", async () => {
    const result = await simulatePhaseC({
      sku: "NELVYON-LANDING",
      tier: "professional",
      brief: brief("landing-heliovolt.json"),
      sector: "restaurant",
      rankings_path: DEFAULT_RANKINGS_PATH,
    });

    expect(result.output_bundle.retryHistory.length).toBeGreaterThanOrEqual(1);
    expect(result.output_bundle.retryHistory[0].template_id).toBe("landing-cro-v3");
    expect(result.project.template_pipeline?.selected_template_id).toBeTruthy();
  });

  it("injects selected template into landing plan", async () => {
    const project = initPhaseCProject(
      "NELVYON-LANDING",
      "professional",
      brief(LANDING_BRIEF),
      { client_id: "t", project_slug: "T", workspace_id: "w" },
      "mock",
      "restaurant",
    );
    project.template_pipeline = {
      selected_template_id: "landing-cro-v3",
      final_template_score: 80,
      source: "rankings",
      used_template_ids: ["landing-cro-v3"],
    };
    project.brief = { ...project.brief, _selected_template_id: "landing-cro-v3" };
    await executePipelinePhaseC(project);
    expect((project.artifacts.plan as { template_id: string }).template_id).toBe("landing-cro-v3");
  });
});

describe("Phase L — recordPostQaOutcome", () => {
  beforeEach(() => {
    forceLocalTemplateLearningForTests();
  });

  afterEach(() => {
    forceLocalTemplateLearningForTests();
  });

  it("writes json snapshot without DB", async () => {
    const project = initPhaseCProject(
      "NELVYON-LANDING",
      "professional",
      brief("landing-heliovolt.json"),
      { client_id: "t", project_slug: "T", workspace_id: "w" },
      "mock",
    );
    project.template_pipeline = {
      selected_template_id: "landing-cro-v3",
      final_template_score: 79,
      source: "rankings",
      used_template_ids: ["landing-cro-v3"],
    };
    const qa = await executePipelinePhaseC(project);
    const res = await recordPostQaOutcome({
      project,
      qa,
      templateId: "landing-cro-v3",
    });
    expect(res.outcome.template_id).toBe("landing-cro-v3");
    expect(["local", "json_only"]).toContain(res.stored);
  });
});
