import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchGa4ConversionMetrics,
  isGa4RealModeEnabled,
  resolveGa4AdapterMode,
} from "../analytics/ga4Adapter";
import * as ga4ServiceAccount from "../analytics/ga4ServiceAccount";
import { buildRealisticMockGa4Metrics } from "../analytics/ga4MockAdapter";
import { computeConversionScore } from "../templates/templateRanking";
import { aggregateOutcomes } from "../templates/templateOutcome";
import { runEnrichOutcomesJob } from "../learning/runEnrichOutcomesJob";
import { rankTemplatesForSlice } from "../templates/templateRanking";
import { loadTemplateRegistry } from "../templates/loadRegistry";
import { loadOutcomesFromJson } from "../templates/templateOutcome";
import { resolveConversionMetrics } from "../portal/conversionMetricsPlaceholder";
import {
  forceLocalTemplateLearningForTests,
  templateOutcomeRepository,
} from "../templates/templateOutcomeRepository";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_FIXTURE = join(__dirname, "..", "fixtures", "learning-outcomes-mock.json");
const TEST_OUTPUT = join(__dirname, "..", "output", "learning", "phase-n-test");

function clearGa4Env(): void {
  delete process.env.ENABLE_AUTONOMOUS_GA4;
  delete process.env.GA4_PROPERTY_ID;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.AUTONOMOUS_GA4_MOCK;
}

describe("Phase N — GA4 adapter flags", () => {
  beforeEach(clearGa4Env);
  afterEach(clearGa4Env);

  it("requires all flags for real mode", () => {
    expect(isGa4RealModeEnabled()).toBe(false);

    process.env.ENABLE_AUTONOMOUS_GA4 = "true";
    process.env.GA4_PROPERTY_ID = "123456";
    expect(isGa4RealModeEnabled()).toBe(false);

    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/tmp/sa.json";
    expect(isGa4RealModeEnabled()).toBe(true);
    expect(resolveGa4AdapterMode()).toBe("real");
  });

  it("falls back to null without credentials", async () => {
    clearGa4Env();
    const m = await fetchGa4ConversionMetrics({ sector: "restaurant" });
    expect(m.conversion_rate).toBeNull();
    expect(m.lead_count).toBe(0);
    expect(m.source).toBe("none");
    expect(m.mode).toBe("fallback");
  });

  it("does not call fetch in default fallback", async () => {
    clearGa4Env();
    const fetchFn = vi.fn();
    await fetchGa4ConversionMetrics({ sector: "dental" }, { fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("Phase N — realistic mock adapter", () => {
  beforeEach(clearGa4Env);
  afterEach(clearGa4Env);

  it("calculates conversion_rate from mock sessions/conversions", () => {
    const m = buildRealisticMockGa4Metrics({
      sector: "restaurant",
      template_id: "landing-cro-v3",
      realistic_mock: true,
    });
    expect(m.sessions).toBeGreaterThan(0);
    expect(m.conversions).toBeGreaterThan(0);
    expect(m.conversion_rate).not.toBeNull();
    expect(m.conversion_rate).toBeGreaterThan(0);
    expect(m.lead_count).toBeGreaterThanOrEqual(m.conversions);
    expect(m.source).toBe("mock");
  });

  it("resolveConversionMetrics uses realistic mock when flagged", () => {
    process.env.AUTONOMOUS_GA4_MOCK = "realistic";
    const m = resolveConversionMetrics({ sector: "restaurant", template_id: "landing-cro-v3" });
    expect(m.conversion_rate).not.toBeNull();
    expect(m.lead_count).toBeGreaterThan(0);
  });
});

describe("Phase N — conversion scoring", () => {
  it("uses conversion_rate when present", () => {
    const sample = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8")))[0];
    const strongCr = [
      { ...sample, conversion_rate: 22, lead_count: 40, qa_score: 92, revisions_count: 0 },
      { ...sample, id: "cr-2", conversion_rate: 18, lead_count: 28, qa_score: 88, revisions_count: 0 },
    ];
    const agg = aggregateOutcomes(strongCr);
    const baseline = { quality_score: 70, conversion_score: 65, usage_score: 60, reliability_score: 68 };
    const withCr = computeConversionScore(agg, baseline, "restaurant", 1);
    const withoutCr = computeConversionScore(
      aggregateOutcomes(strongCr.map((o) => ({ ...o, conversion_rate: null, lead_count: 0 }))),
      baseline,
      "restaurant",
      1,
    );
    expect(agg.conversion_measured).toBe(2);
    expect(agg.conversion_avg).not.toBeNull();
    expect(withCr).toBeGreaterThan(withoutCr);
  });

  it("uses lead_count softly when no conversion_rate", () => {
    const base = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8"))).filter(
      (o) => o.template_id === "landing-cro-v3",
    )[0];
    const outcomes = [
      { ...base, conversion_rate: null, lead_count: 12 },
      { ...base, id: "o2", conversion_rate: null, lead_count: 8 },
    ];
    const agg = aggregateOutcomes(outcomes);
    const withLeads = computeConversionScore(
      agg,
      { quality_score: 70, conversion_score: 65, usage_score: 60, reliability_score: 68 },
      "restaurant",
      1,
    );
    const noLeads = computeConversionScore(
      aggregateOutcomes(outcomes.map((o) => ({ ...o, lead_count: 0 }))),
      { quality_score: 70, conversion_score: 65, usage_score: 60, reliability_score: 68 },
      "restaurant",
      1,
    );
    expect(withLeads).toBeGreaterThanOrEqual(noLeads);
  });

  it("outcomes without data do not break ranking", () => {
    const registry = loadTemplateRegistry();
    const empty: ReturnType<typeof loadOutcomesFromJson> = [];
    const ranked = rankTemplatesForSlice(
      { category: "landing", sector: "restaurant", service: "landing" },
      empty,
      registry.templates,
    );
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].final_template_score).toBeGreaterThan(0);
  });
});

describe("Phase N — enrich outcomes job", () => {
  beforeEach(() => {
    clearGa4Env();
    forceLocalTemplateLearningForTests();
  });
  afterEach(() => {
    clearGa4Env();
    forceLocalTemplateLearningForTests();
    if (existsSync(TEST_OUTPUT)) rmSync(TEST_OUTPUT, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("enriches outcomes and updates rankings with conversion_rate", async () => {
    process.env.AUTONOMOUS_GA4_MOCK = "realistic";
    const mock = loadOutcomesFromJson(JSON.parse(readFileSync(MOCK_FIXTURE, "utf-8"))).slice(0, 4);
    for (const o of mock) {
      await templateOutcomeRepository.recordOutcome({
        template_id: o.template_id,
        category: o.category,
        sector: o.sector,
        service: o.service,
        qa_score: o.qa_score,
        metadata: { project_ref: o.project_ref },
      });
    }

    const result = await runEnrichOutcomesJob({
      output_dir: TEST_OUTPUT,
      realistic_mock: true,
    });

    expect(result.report.phase).toBe("N");
    expect(result.report.with_conversion_rate).toBeGreaterThan(0);
    expect(existsSync(result.enriched_path)).toBe(true);
    expect(existsSync(result.rankings_path)).toBe(true);

    const enriched = JSON.parse(readFileSync(result.enriched_path, "utf-8")) as {
      enriched: Array<{ ga4: { conversion_rate: number | null } }>;
    };
    expect(enriched.enriched.some((e) => e.ga4.conversion_rate !== null)).toBe(true);

    const rankings = JSON.parse(readFileSync(result.rankings_path, "utf-8")) as {
      enriched: boolean;
      slices: Array<{ ranked: Array<{ conversion_score: number }> }>;
    };
    expect(rankings.enriched).toBe(true);
    expect(rankings.slices[0].ranked[0].conversion_score).toBeGreaterThan(0);
    expect(result.report.autonomy_pct.current).toBe(82);
  });

  it("real mode uses injected fetchFn when token is available", async () => {
    clearGa4Env();
    process.env.ENABLE_AUTONOMOUS_GA4 = "true";
    process.env.GA4_PROPERTY_ID = "999888";
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/secrets/ga4-sa-staging.json";
    vi.spyOn(ga4ServiceAccount, "getGa4AccessTokenFromServiceAccount").mockResolvedValue("test-token");

    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          rows: [{ metricValues: [{ value: "1000" }, { value: "85" }] }],
        }),
        { status: 200 },
      );
    });

    await templateOutcomeRepository.recordOutcome({
      template_id: "landing-cro-v3",
      category: "landing",
      sector: "restaurant",
      service: "landing",
      metadata: { project_ref: "ga4-real-test" },
    });

    const result = await runEnrichOutcomesJob({
      output_dir: TEST_OUTPUT,
      fetchFn: fetchFn as typeof fetch,
    });

    expect(fetchFn).toHaveBeenCalled();
    expect(result.enriched[0]?.ga4.source).toBe("ga4");
    expect(result.enriched[0]?.ga4.conversion_rate).toBe(8.5);
  });
});
