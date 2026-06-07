import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { invokeLlm, resolveLlmMode, setLlmInvokeForTests } from "../llm/llmAdapter";
import { parseJsonFromLlm } from "../llm/parseJson";
import { scoreOffline } from "../qa/offlineScorer";
import { executePipelinePhaseC, initPhaseCProject } from "../pipelines/runPipelinePhaseC";
import { simulatePhaseC } from "../simulatorPhaseC";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "fixtures", "briefs");

function brief(name: string) {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf-8")) as Record<string, unknown>;
}

describe("Phase C — LLM adapter", () => {
  afterEach(() => {
    setLlmInvokeForTests(null);
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_LLM_MODE;
  });

  it("resolveLlmMode is mock without API key", () => {
    delete process.env.OPENAI_API_KEY;
    expect(resolveLlmMode()).toBe("mock");
  });

  it("invokeLlm mock never throws without API key", async () => {
    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: { tier: "professional" },
      mockGenerator: () => ({ template_id: "landing-cro-v1", blockers: [] }),
    });
    expect(res.mode).toBe("mock");
    expect(res.parsed).toMatchObject({ template_id: expect.any(String) });
  });

  it("mocked real adapter returns JSON contract", async () => {
    setLlmInvokeForTests(async (req) => ({
      mode: "real",
      agentId: req.agentId,
      model: "test-model",
      parsed: { template_id: "landing-cro-v5", blockers: [], timeline_hours: 48 },
      tokens: 42,
      duration_ms: 1,
    }));

    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: {},
      mockGenerator: () => ({ blockers: ["fail"] }),
    });
    expect(res.mode).toBe("real");
    expect((res.parsed as { template_id: string }).template_id).toBe("landing-cro-v5");
  });

  it("parseJsonFromLlm handles fenced JSON", () => {
    const parsed = parseJsonFromLlm('```json\n{"a":1}\n```');
    expect(parsed).toEqual({ a: 1 });
  });
});

describe("Phase C — offline QA", () => {
  it("blocks incomplete brief below threshold", async () => {
    const project = initPhaseCProject(
      "NELVYON-LANDING",
      "professional",
      brief("landing-incomplete.json"),
      { client_id: "t", project_slug: "T", workspace_id: "w" },
      "mock",
    );
    const qa = await executePipelinePhaseC(project);
    expect(qa.passed).toBe(false);
    expect(qa.score).toBeLessThan(85);
  });

  it("passes complete landing fixture with score >= 85", async () => {
    const project = initPhaseCProject(
      "NELVYON-LANDING",
      "professional",
      brief("landing-heliovolt.json"),
      { client_id: "t", project_slug: "T", workspace_id: "w" },
      "mock",
    );
    const qa = await executePipelinePhaseC(project);
    expect(qa.score).toBeGreaterThanOrEqual(85);
    expect(qa.offline_dimensions).toBeDefined();
  });
});

describe("Phase C — simulator", () => {
  afterEach(() => {
    setLlmInvokeForTests(null);
    process.env.AUTONOMOUS_LLM_MODE = "mock";
  });

  it("runs 3 SKUs without DB or portal", async () => {
    process.env.AUTONOMOUS_LLM_MODE = "mock";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await simulatePhaseC({
      sku: "NELVYON-CHATBOT",
      brief: brief("chatbot-sonrisa.json"),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.project.simulation_mode).toBe("phase-c-llm-qa");
    expect(result.output_bundle.osPublishPayload?.dry_run).toBe(true);
    expect(result.output_bundle.retryHistory.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });

  it("retries up to max when QA forced low", async () => {
    setLlmInvokeForTests(async (req) => {
      if (req.agentId === "agent-copywriter-landing") {
        return {
          mode: "mock",
          agentId: req.agentId,
          model: "broken",
          parsed: {
            version: 1,
            hero: { headline: "Bad", subheadline: "x", cta_label: "A" },
            meta: { title: "Bad", description: "x" },
            faq: [],
            primary_cta_count: 2,
          },
          tokens: 0,
          duration_ms: 1,
          fallbackReason: "test",
        };
      }
      return {
        mode: "mock",
        agentId: req.agentId,
        model: "mock-rules-v1",
        parsed: req.mockGenerator(),
        tokens: 0,
        duration_ms: 1,
      };
    });

    const result = await simulatePhaseC({
      sku: "NELVYON-LANDING",
      brief: brief("landing-heliovolt.json"),
    });

    expect(result.project.retry_count).toBeGreaterThan(0);
    expect(result.output_bundle.retryHistory.length).toBeGreaterThan(1);
    setLlmInvokeForTests(null);
  });

  it("scoreOffline escalates on corrupt artifacts", () => {
    const qa = scoreOffline("NELVYON-SEO", brief("seo-alonso-vega.json"), {}, 1);
    expect(qa.passed).toBe(false);
    expect(qa.score).toBeLessThan(85);
  });
});
