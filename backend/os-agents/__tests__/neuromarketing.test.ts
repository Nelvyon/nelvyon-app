// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  NeuromarketingCopyAgent,
  NeuromarketingConversionAgent,
  NeuromarketingEmocionesAgent,
  NeuromarketingPersonalidadAgent,
  NeuromarketingPricingAgent,
  NeuromarketingSesgosAgent,
  NeuromarketingTestingAgent,
  NeuromarketingUxAgent,
  resetAllNeuromarketingAgentsForTests,
} from "../sectors/neuromarketing";

const NEUROMARKETING_JSON = JSON.stringify({
  result: "Neuromarketing OS: sesgos, copy y tests conductuales con métricas claras.",
  insights: ["Anclaje antes del precio mejora percepción de valor", "Micro-compromisos reducen abandono de formulario"],
  recommendedActions: ["Plan A/B con guardrail revenue", "Matriz sesgo × etapa funnel", "Revisión ética claims"],
});

const neuromarketingInput = {
  userId: "00000000-0000-0000-0000-00000000nm01",
  businessContext: "Ecommerce beauty EU: carrito alto abandono, prueba social ya presente en PDP.",
  agentId: "neuromarketing-sesgos",
};

describe("Neuromarketing agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(NEUROMARKETING_JSON);
    resetAllNeuromarketingAgentsForTests();
  });

  async function assertOutput(runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { result: string; insights: string[]; recommendedActions: string[] };
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.insights.length).toBeGreaterThanOrEqual(1);
    expect(out.recommendedActions.length).toBeGreaterThanOrEqual(1);
  }

  it("NeuromarketingSesgosAgent", async () => {
    await assertOutput(() => NeuromarketingSesgosAgent.instance().execute(neuromarketingInput));
  });
  it("NeuromarketingCopyAgent", async () => {
    await assertOutput(() => NeuromarketingCopyAgent.instance().execute(neuromarketingInput));
  });
  it("NeuromarketingPricingAgent", async () => {
    await assertOutput(() => NeuromarketingPricingAgent.instance().execute(neuromarketingInput));
  });
  it("NeuromarketingUxAgent", async () => {
    await assertOutput(() => NeuromarketingUxAgent.instance().execute(neuromarketingInput));
  });
  it("NeuromarketingEmocionesAgent", async () => {
    await assertOutput(() => NeuromarketingEmocionesAgent.instance().execute(neuromarketingInput));
  });
  it("NeuromarketingConversionAgent", async () => {
    await assertOutput(() => NeuromarketingConversionAgent.instance().execute(neuromarketingInput));
  });
  it("NeuromarketingTestingAgent", async () => {
    await assertOutput(() => NeuromarketingTestingAgent.instance().execute(neuromarketingInput));
  });
  it("NeuromarketingPersonalidadAgent", async () => {
    await assertOutput(() => NeuromarketingPersonalidadAgent.instance().execute(neuromarketingInput));
  });
});
