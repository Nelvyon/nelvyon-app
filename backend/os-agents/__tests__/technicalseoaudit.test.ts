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
  TechnicalSeoAuditCoreWebVitalsAgent,
  TechnicalSeoAuditCrawlerAgent,
  TechnicalSeoAuditIndexabilityAgent,
  TechnicalSeoAuditInternationalAgent,
  TechnicalSeoAuditMobileAgent,
  TechnicalSeoAuditReportAgent,
  TechnicalSeoAuditSecurityAgent,
  TechnicalSeoAuditStructuredDataAgent,
  resetAllTechnicalSeoAuditAgentsForTests,
} from "../sectors/technicalseoaudit";

const TSA_JSON = JSON.stringify({
  content:
    "TechnicalSeoAudit: auditoría <60s, 200+ errores, CWV por página, priorización impacto, fixes con código, 24/7.",
  score: 94,
  highlights: ["<60s", "200+ errores", "CWV por página"],
  metrics: ["Critical issues"],
});

const technicalSeoAuditInput = {
  userId: "00000000-0000-0000-0000-00000000ts01",
  sector: "saas",
  brand: "SaaS demo",
  auditBrief: "Auditoría técnica · CWV · index",
  metricsBrief: "Errores críticos · CWV",
};

type TechnicalSeoAuditOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("TechnicalSeoAudit agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(TSA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllTechnicalSeoAuditAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as TechnicalSeoAuditOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("TechnicalSeoAuditCrawlerAgent", async () => {
    await assertOutput("technicalseoaudit-crawler", () => TechnicalSeoAuditCrawlerAgent.instance.run(technicalSeoAuditInput));
  });

  it("TechnicalSeoAuditCoreWebVitalsAgent", async () => {
    await assertOutput("technicalseoaudit-corewebvitals", () =>
      TechnicalSeoAuditCoreWebVitalsAgent.instance.run(technicalSeoAuditInput),
    );
  });

  it("TechnicalSeoAuditIndexabilityAgent", async () => {
    await assertOutput("technicalseoaudit-indexability", () =>
      TechnicalSeoAuditIndexabilityAgent.instance.run(technicalSeoAuditInput),
    );
  });

  it("TechnicalSeoAuditStructuredDataAgent", async () => {
    await assertOutput("technicalseoaudit-structureddata", () =>
      TechnicalSeoAuditStructuredDataAgent.instance.run(technicalSeoAuditInput),
    );
  });

  it("TechnicalSeoAuditSecurityAgent", async () => {
    await assertOutput("technicalseoaudit-security", () => TechnicalSeoAuditSecurityAgent.instance.run(technicalSeoAuditInput));
  });

  it("TechnicalSeoAuditMobileAgent", async () => {
    await assertOutput("technicalseoaudit-mobile", () => TechnicalSeoAuditMobileAgent.instance.run(technicalSeoAuditInput));
  });

  it("TechnicalSeoAuditInternationalAgent", async () => {
    await assertOutput("technicalseoaudit-international", () =>
      TechnicalSeoAuditInternationalAgent.instance.run(technicalSeoAuditInput),
    );
  });

  it("TechnicalSeoAuditReportAgent", async () => {
    await assertOutput("technicalseoaudit-report", () => TechnicalSeoAuditReportAgent.instance.run(technicalSeoAuditInput));
  });
});
