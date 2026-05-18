import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import {
  FormulariosEncuestasAIAgent,
  FormulariosEncuestasAnalyticsAgent,
  FormulariosEncuestasBuilderAgent,
  FormulariosEncuestasDesignAgent,
  FormulariosEncuestasIntegrationAgent,
  FormulariosEncuestasLogicAgent,
  FormulariosEncuestasNPSAgent,
  FormulariosEncuestasReportAgent,
  resetAllFormulariosEncuestasAgentsForTests,
} from "../sectors/formulariosencuestas";

const FE_JSON = JSON.stringify({
  content:
    "FormulariosEncuestas: form <2 min, completion >65%, NPS RT, CRM <5s, sentimiento >90%, A/B auto.",
  score: 93,
  highlights: ["Form <2 min", ">65% completion", "NPS RT"],
  metrics: ["Completion rate"],
});

const formulariosEncuestasInput = {
  userId: "00000000-0000-0000-0000-00000000fe01",
  sector: "services",
  brand: "Services demo",
  formBrief: "Encuesta NPS · multi-paso",
  metricsBrief: "Completion rate · NPS RT",
};

type FormulariosEncuestasOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("FormulariosEncuestas agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(FE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllFormulariosEncuestasAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as FormulariosEncuestasOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("FormulariosEncuestasBuilderAgent", async () => {
    await assertOutput("formulariosencuestas-builder", () =>
      FormulariosEncuestasBuilderAgent.instance.run(formulariosEncuestasInput),
    );
  });

  it("FormulariosEncuestasDesignAgent", async () => {
    await assertOutput("formulariosencuestas-design", () =>
      FormulariosEncuestasDesignAgent.instance.run(formulariosEncuestasInput),
    );
  });

  it("FormulariosEncuestasLogicAgent", async () => {
    await assertOutput("formulariosencuestas-logic", () =>
      FormulariosEncuestasLogicAgent.instance.run(formulariosEncuestasInput),
    );
  });

  it("FormulariosEncuestasAnalyticsAgent", async () => {
    await assertOutput("formulariosencuestas-analytics", () =>
      FormulariosEncuestasAnalyticsAgent.instance.run(formulariosEncuestasInput),
    );
  });

  it("FormulariosEncuestasNPSAgent", async () => {
    await assertOutput("formulariosencuestas-nps", () =>
      FormulariosEncuestasNPSAgent.instance.run(formulariosEncuestasInput),
    );
  });

  it("FormulariosEncuestasIntegrationAgent", async () => {
    await assertOutput("formulariosencuestas-integration", () =>
      FormulariosEncuestasIntegrationAgent.instance.run(formulariosEncuestasInput),
    );
  });

  it("FormulariosEncuestasAIAgent", async () => {
    await assertOutput("formulariosencuestas-ai", () => FormulariosEncuestasAIAgent.instance.run(formulariosEncuestasInput));
  });

  it("FormulariosEncuestasReportAgent", async () => {
    await assertOutput("formulariosencuestas-report", () =>
      FormulariosEncuestasReportAgent.instance.run(formulariosEncuestasInput),
    );
  });
});
