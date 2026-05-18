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
  IaPredictivaAlertasAgent,
  IaPredictivaAnomaliaAgent,
  IaPredictivaChurnAgent,
  IaPredictivaForecastAgent,
  IaPredictivaInventarioAgent,
  IaPredictivaLtvAgent,
  IaPredictivaRecomendacionAgent,
  IaPredictivaSegmentacionAgent,
  resetAllIaPredictivaAgentsForTests,
} from "../sectors/iapredictiva";

const IA_PREDICTIVA_JSON = JSON.stringify({
  result: "IA predictiva OS: churn, forecast, anomalías, LTV e inventario con supuestos explícitos.",
  score: 89,
  recommendations: ["Validar finance LTV", "Fairness churn", "Bandera estacionalidad"],
});

const iaPredictivaInput = {
  userId: "00000000-0000-0000-0000-00000000ip01",
  businessName: "Negocio demo",
  services: ["BigQuery", "Looker"],
  targets: ["60d", "EU"],
  metadata: { program: "iapredictiva_v1" },
};

describe("IaPredictiva agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(IA_PREDICTIVA_JSON);
    resetAllIaPredictivaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("IaPredictivaChurnAgent", async () => {
    await assertOutput("iapredictiva-churn", () => IaPredictivaChurnAgent.instance().run(iaPredictivaInput));
  });
  it("IaPredictivaForecastAgent", async () => {
    await assertOutput("iapredictiva-forecast", () => IaPredictivaForecastAgent.instance().run(iaPredictivaInput));
  });
  it("IaPredictivaAnomaliaAgent", async () => {
    await assertOutput("iapredictiva-anomalia", () => IaPredictivaAnomaliaAgent.instance().run(iaPredictivaInput));
  });
  it("IaPredictivaSegmentacionAgent", async () => {
    await assertOutput("iapredictiva-segmentacion", () => IaPredictivaSegmentacionAgent.instance().run(iaPredictivaInput));
  });
  it("IaPredictivaRecomendacionAgent", async () => {
    await assertOutput("iapredictiva-recomendacion", () => IaPredictivaRecomendacionAgent.instance().run(iaPredictivaInput));
  });
  it("IaPredictivaLtvAgent", async () => {
    await assertOutput("iapredictiva-ltv", () => IaPredictivaLtvAgent.instance().run(iaPredictivaInput));
  });
  it("IaPredictivaAlertasAgent", async () => {
    await assertOutput("iapredictiva-alertas", () => IaPredictivaAlertasAgent.instance().run(iaPredictivaInput));
  });
  it("IaPredictivaInventarioAgent", async () => {
    await assertOutput("iapredictiva-inventario", () => IaPredictivaInventarioAgent.instance().run(iaPredictivaInput));
  });
});
