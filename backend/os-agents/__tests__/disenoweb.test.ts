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
  DisenoWebAnalyticsAgent,
  DisenoWebAuditAgent,
  DisenoWebConversionAgent,
  DisenoWebCopyAgent,
  DisenoWebGeneratorAgent,
  DisenoWebMaintenanceAgent,
  DisenoWebResponsiveAgent,
  DisenoWebSEOAgent,
  resetAllDisenoWebAgentsForTests,
} from "../sectors/disenoweb";

const DW_JSON = JSON.stringify({
  content:
    "Diseño web: auditoría <3 min, diseño <10 min, PageSpeed >95, CRO +40%, WCAG AA 100%, mantenimiento 100% auto.",
  score: 95,
  highlights: ["<3 min audit", ">95 PageSpeed", "WCAG AA"],
  metrics: ["PageSpeed score"],
});

const disenoWebInput = {
  userId: "00000000-0000-0000-0000-00000000dw01",
  sector: "servicios",
  brand: "Web demo",
  disenoWebBrief: "Diseño web · UX",
  metricsBrief: "PageSpeed · CRO",
};

type DisenoWebOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("DisenoWeb agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(DW_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllDisenoWebAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as DisenoWebOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("DisenoWebAuditAgent", async () => {
    await assertOutput("disenoweb-disenowebaudit", () => DisenoWebAuditAgent.instance.run(disenoWebInput));
  });

  it("DisenoWebGeneratorAgent", async () => {
    await assertOutput("disenoweb-disenowebgenerator", () => DisenoWebGeneratorAgent.instance.run(disenoWebInput));
  });

  it("DisenoWebSEOAgent", async () => {
    await assertOutput("disenoweb-disenowebseo", () => DisenoWebSEOAgent.instance.run(disenoWebInput));
  });

  it("DisenoWebCopyAgent", async () => {
    await assertOutput("disenoweb-disenowebcopy", () => DisenoWebCopyAgent.instance.run(disenoWebInput));
  });

  it("DisenoWebConversionAgent", async () => {
    await assertOutput("disenoweb-disenowebconversion", () => DisenoWebConversionAgent.instance.run(disenoWebInput));
  });

  it("DisenoWebResponsiveAgent", async () => {
    await assertOutput("disenoweb-disenowebresponsive", () => DisenoWebResponsiveAgent.instance.run(disenoWebInput));
  });

  it("DisenoWebAnalyticsAgent", async () => {
    await assertOutput("disenoweb-disenowebanalytics", () => DisenoWebAnalyticsAgent.instance.run(disenoWebInput));
  });

  it("DisenoWebMaintenanceAgent", async () => {
    await assertOutput("disenoweb-disenowebmaintenance", () => DisenoWebMaintenanceAgent.instance.run(disenoWebInput));
  });
});
