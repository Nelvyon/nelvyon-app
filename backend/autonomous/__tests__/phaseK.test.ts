import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { runLearningEngine } from "../learning/runLearningEngine";
import { applyClientEvent, ingestPhaseHOutput } from "../templates/learningEvents";
import { loadOutcomesFromJson, normalizeOutcome } from "../templates/templateOutcome";
import { rankTemplate, rankTemplatesForSlice } from "../templates/templateRanking";
import { loadTemplateRegistry } from "../templates/loadRegistry";
import {
  selectBestTemplate,
  selectByCategory,
  selectBySectorAndService,
} from "../templates/templateSelector";
import type { TemplateOutcome, TemplateRegistryEntry } from "../templates/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "..", "fixtures", "learning-outcomes-mock.json");
const REGISTRY = join(__dirname, "..", "templates", "registry.json");
const PHASE_H = join(__dirname, "..", "output", "phase-h", "restaurant-landing");

function loadMockOutcomes(): TemplateOutcome[] {
  return loadOutcomesFromJson(JSON.parse(readFileSync(FIXTURE, "utf-8")));
}

function entry(id: string, registry: TemplateRegistryEntry[]): TemplateRegistryEntry {
  const e = registry.find((t) => t.id === id);
  if (!e) throw new Error(`template ${id} not in registry`);
  return e;
}

describe("Phase K — template outcome model", () => {
  it("normalizes and validates outcomes", () => {
    const o = normalizeOutcome({
      template_id: "landing-cro-v3",
      category: "landing",
      sector: "restaurant",
      service: "landing",
      qa_score: 105,
      revisions_count: -1,
      conversion_rate: 8.5,
      result_status: "client_approved",
    });
    expect(o.qa_score).toBe(100);
    expect(o.revisions_count).toBe(0);
    expect(o.conversion_rate).toBe(8.5);
  });

  it("loads mock fixtures", () => {
    const outcomes = loadMockOutcomes();
    expect(outcomes.length).toBeGreaterThanOrEqual(10);
    expect(outcomes.every((o) => o.template_id.length > 0)).toBe(true);
  });
});

describe("Phase K — ranking engine", () => {
  it("ranks landing-cro-v3 above rejected dental template in restaurant slice", () => {
    const outcomes = loadMockOutcomes();
    const registry = loadTemplateRegistry(REGISTRY).templates;

    const ranked = rankTemplatesForSlice(
      {
        category: "landing",
        sector: "restaurant",
        service: "landing",
        objective: "booking",
        channel: "web",
        language: "es",
        level: "professional",
      },
      outcomes,
      registry,
    );

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].template_id).toBe("landing-cro-v3");
    expect(ranked[0].final_template_score).toBeGreaterThan(60);
    expect(ranked[0].quality_score).toBeGreaterThan(80);
  });

  it("penalizes client rejection and high revisions", () => {
    const outcomes = loadMockOutcomes();
    const registry = loadTemplateRegistry(REGISTRY).templates;

    const good = rankTemplate(
      "landing-cro-v3",
      outcomes.filter((o) => o.template_id === "landing-cro-v3"),
      entry("landing-cro-v3", registry),
      3,
      "restaurant",
    );

    const bad = rankTemplate(
      "landing-hero-split",
      outcomes.filter((o) => o.template_id === "landing-hero-split" && o.result_status === "client_rejected"),
      entry("landing-hero-split", registry),
      1,
      "dental",
    );

    expect(good.reliability_score).toBeGreaterThan(bad.reliability_score);
    expect(good.final_template_score).toBeGreaterThan(bad.final_template_score);
    expect(bad.metrics.reject_rate).toBeGreaterThan(0);
  });

  it("applies cold-start penalty for templates with few samples", () => {
    const outcomes = loadMockOutcomes().filter((o) => o.template_id === "landing-hero-split" && o.sector === "legal");
    const registry = loadTemplateRegistry(REGISTRY).templates;

    const cold = rankTemplate(
      "landing-hero-split",
      outcomes,
      entry("landing-hero-split", registry),
      1,
      "legal",
    );

    expect(cold.sample_size).toBe(1);
    expect(cold.cold_start).toBe(true);
    expect(cold.final_template_score).toBeLessThan(cold.quality_score + 20);
  });
});

describe("Phase K — template selector", () => {
  it("selects best template by sector and service", () => {
    const outcomes = loadMockOutcomes();
    const registry = loadTemplateRegistry(REGISTRY).templates;

    const restaurant = selectBySectorAndService("restaurant", "landing", "landing", outcomes, registry);
    expect(restaurant?.selected_template_id).toBe("landing-cro-v3");

    const saas = selectBySectorAndService("saas_b2b", "landing", "landing", outcomes, registry);
    expect(saas?.selected_template_id).toBe("landing-saas-trial");
  });

  it("selects by category landing across sectors", () => {
    const outcomes = loadMockOutcomes();
    const registry = loadTemplateRegistry(REGISTRY).templates;
    const picks = selectByCategory("landing", outcomes, registry);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.some((p) => p.slice.sector === "restaurant")).toBe(true);
  });

  it("returns null when no registry match", () => {
    const outcomes = loadMockOutcomes();
    const registry = loadTemplateRegistry(REGISTRY).templates;
    const sel = selectBestTemplate(
      { category: "ecommerce", sector: "ecommerce", service: "ecommerce" },
      outcomes,
      registry,
    );
    expect(sel).toBeNull();
  });
});

describe("Phase K — learning events Phase H", () => {
  it("ingests Phase H output without DB", () => {
    const { events, outcome } = ingestPhaseHOutput(PHASE_H);
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.some((e) => e.type === "qa_completed")).toBe(true);
    expect(events.some((e) => e.type === "os_publish_dry_run")).toBe(true);
    expect(outcome?.template_id).toBe("landing-cro-v3");
    expect(outcome?.qa_score).toBeGreaterThanOrEqual(85);
  });

  it("applies client rejected event", () => {
    const outcomes = loadMockOutcomes().slice(0, 1);
    const updated = applyClientEvent(outcomes, {
      type: "client_rejected",
      at: new Date().toISOString(),
      project_ref: outcomes[0].project_ref,
      template_id: outcomes[0].template_id,
      sector: "restaurant",
      category: "landing",
      payload: { reason: "test reject", revisions_count: 3 },
    });
    expect(updated[0].approved_by_client).toBe(false);
    expect(updated[0].result_status).toBe("client_rejected");
    expect(updated[0].revisions_count).toBe(3);
  });
});

describe("Phase K — learning engine CLI output", () => {
  it("produces valid JSON outputs", () => {
    const result = runLearningEngine({
      output_dir: join(__dirname, "..", "output", "learning-test"),
    });

    expect(result.report.phase).toBe("K");
    expect(result.report.outcomes_count).toBeGreaterThan(10);
    expect(result.report.selections.length).toBeGreaterThan(0);
    expect(result.report.autonomy_pct.current).toBe(74);

    const rankings = JSON.parse(readFileSync(result.rankings_path, "utf-8")) as {
      slices: Array<{ ranked: Array<{ final_template_score: number }> }>;
    };
    expect(rankings.slices.length).toBeGreaterThan(0);
    expect(rankings.slices[0].ranked[0].final_template_score).toBeGreaterThan(0);

    const selections = JSON.parse(readFileSync(result.selections_path, "utf-8")) as {
      selections: Array<{ selected_template_id: string }>;
    };
    expect(selections.selections.some((s) => s.selected_template_id === "landing-cro-v3")).toBe(true);
  });
});
