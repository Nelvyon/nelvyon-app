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
  MembresiaCursosAccessAgent,
  MembresiaCursosAnalyticsAgent,
  MembresiaCursosBuilderAgent,
  MembresiaCursosCertificateAgent,
  MembresiaCursosCommunityAgent,
  MembresiaCursosEngagementAgent,
  MembresiaCursosMonetizationAgent,
  MembresiaCursosProgressAgent,
  resetAllMembresiaCursosAgentsForTests,
} from "../sectors/membresiacursos";

const MC_JSON = JSON.stringify({
  content:
    "MembresiaCursos: curso <10 min, completion >70%, certificados <5s, Paddle, comunidad IA, analytics RT.",
  score: 94,
  highlights: ["Curso <10 min", ">70% completion", "Cert <5s"],
  metrics: ["Course completion"],
});

const membresiaCursosInput = {
  userId: "00000000-0000-0000-0000-00000000mc01",
  sector: "education",
  brand: "Education demo",
  courseBrief: "Membresía · módulos · certificados",
  metricsBrief: "Completion rate · LTV",
};

type MembresiaCursosOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("MembresiaCursos agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllMembresiaCursosAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as MembresiaCursosOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("MembresiaCursosBuilderAgent", async () => {
    await assertOutput("membresiacursos-builder", () => MembresiaCursosBuilderAgent.instance.run(membresiaCursosInput));
  });

  it("MembresiaCursosAccessAgent", async () => {
    await assertOutput("membresiacursos-access", () => MembresiaCursosAccessAgent.instance.run(membresiaCursosInput));
  });

  it("MembresiaCursosCommunityAgent", async () => {
    await assertOutput("membresiacursos-community", () => MembresiaCursosCommunityAgent.instance.run(membresiaCursosInput));
  });

  it("MembresiaCursosProgressAgent", async () => {
    await assertOutput("membresiacursos-progress", () => MembresiaCursosProgressAgent.instance.run(membresiaCursosInput));
  });

  it("MembresiaCursosMonetizationAgent", async () => {
    await assertOutput("membresiacursos-monetization", () =>
      MembresiaCursosMonetizationAgent.instance.run(membresiaCursosInput),
    );
  });

  it("MembresiaCursosEngagementAgent", async () => {
    await assertOutput("membresiacursos-engagement", () =>
      MembresiaCursosEngagementAgent.instance.run(membresiaCursosInput),
    );
  });

  it("MembresiaCursosAnalyticsAgent", async () => {
    await assertOutput("membresiacursos-analytics", () =>
      MembresiaCursosAnalyticsAgent.instance.run(membresiaCursosInput),
    );
  });

  it("MembresiaCursosCertificateAgent", async () => {
    await assertOutput("membresiacursos-certificate", () =>
      MembresiaCursosCertificateAgent.instance.run(membresiaCursosInput),
    );
  });
});
