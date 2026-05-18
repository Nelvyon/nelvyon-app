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
  AuditoriaContableAgent,
  CierreContableAgent,
  ContabilidadAnalyticsAgent,
  ContabilidadAutomaticaAgent,
  FacturacionAgent,
  ImpuestosAgent,
  ReconciliacionAgent,
  TesoreriaAgent,
  resetAllContabilidadAgentsForTests,
} from "../sectors/contabilidad";

const CONT_JSON = JSON.stringify({
  content:
    "Contabilidad: registro <30 s, conciliación 100%, fiscal 195 países, cash <5 min, cierre <10 min, fraude <1 h.",
  score: 95,
  highlights: ["<30 s doc", "Conciliación 100%", "Cierre <10 min"],
  metrics: ["Doc processing time"],
});

const contabilidadInput = {
  userId: "00000000-0000-0000-0000-00000000ct01",
  sector: "finanzas",
  brand: "Empresa demo",
  contabilidadBrief: "Contabilidad · facturas",
  metricsBrief: "Conciliación · impuestos",
};

type ContabilidadOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Contabilidad agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CONT_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllContabilidadAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ContabilidadOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ContabilidadAutomaticaAgent", async () => {
    await assertOutput("contabilidad-contabilidadautomatica", () =>
      ContabilidadAutomaticaAgent.instance.run(contabilidadInput),
    );
  });

  it("ReconciliacionAgent", async () => {
    await assertOutput("contabilidad-reconciliacion", () => ReconciliacionAgent.instance.run(contabilidadInput));
  });

  it("ImpuestosAgent", async () => {
    await assertOutput("contabilidad-impuestos", () => ImpuestosAgent.instance.run(contabilidadInput));
  });

  it("FacturacionAgent", async () => {
    await assertOutput("contabilidad-facturacion", () => FacturacionAgent.instance.run(contabilidadInput));
  });

  it("TesoreriaAgent", async () => {
    await assertOutput("contabilidad-tesoreria", () => TesoreriaAgent.instance.run(contabilidadInput));
  });

  it("CierreContableAgent", async () => {
    await assertOutput("contabilidad-cierrecontable", () => CierreContableAgent.instance.run(contabilidadInput));
  });

  it("AuditoriaContableAgent", async () => {
    await assertOutput("contabilidad-auditoriacontable", () =>
      AuditoriaContableAgent.instance.run(contabilidadInput),
    );
  });

  it("ContabilidadAnalyticsAgent", async () => {
    await assertOutput("contabilidad-contabilidadanalytics", () =>
      ContabilidadAnalyticsAgent.instance.run(contabilidadInput),
    );
  });
});
