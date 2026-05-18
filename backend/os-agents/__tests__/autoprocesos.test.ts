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
  AutoprocesosAlertasAgent,
  AutoprocesosContratosAgent,
  AutoprocesosEmailsAgent,
  AutoprocesosFacturasAgent,
  AutoprocesosIntegracionAgent,
  AutoprocesosOptimizadorAgent,
  AutoprocesosReportesAgent,
  AutoprocesosWorkflowAgent,
  resetAllAutoprocesosAgentsForTests,
} from "../sectors/autoprocesos";

const AUTOPROCESOS_JSON = JSON.stringify({
  result: "Autoprocesos OS: workflows, integraciones CRM/ERP, alertas KPI y optimización continua.",
  score: 89,
  recommendations: ["Idempotencia", "Human-in-the-loop legal", "Observabilidad por paso"],
});

const autoprocesosInput = {
  userId: "00000000-0000-0000-0000-00000000ap01",
  businessName: "Ops demo",
  services: ["n8n", "HubSpot"],
  targets: ["Lead-to-cash"],
  metadata: { program: "autoprocesos_v1" },
};

describe("Autoprocesos agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(AUTOPROCESOS_JSON);
    resetAllAutoprocesosAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("AutoprocesosWorkflowAgent", async () => {
    await assertOutput("autoprocesos-workflow", () => AutoprocesosWorkflowAgent.instance().run(autoprocesosInput));
  });
  it("AutoprocesosReportesAgent", async () => {
    await assertOutput("autoprocesos-reportes", () => AutoprocesosReportesAgent.instance().run(autoprocesosInput));
  });
  it("AutoprocesosIntegracionAgent", async () => {
    await assertOutput("autoprocesos-integracion", () => AutoprocesosIntegracionAgent.instance().run(autoprocesosInput));
  });
  it("AutoprocesosAlertasAgent", async () => {
    await assertOutput("autoprocesos-alertas", () => AutoprocesosAlertasAgent.instance().run(autoprocesosInput));
  });
  it("AutoprocesosFacturasAgent", async () => {
    await assertOutput("autoprocesos-facturas", () => AutoprocesosFacturasAgent.instance().run(autoprocesosInput));
  });
  it("AutoprocesosContratosAgent", async () => {
    await assertOutput("autoprocesos-contratos", () => AutoprocesosContratosAgent.instance().run(autoprocesosInput));
  });
  it("AutoprocesosEmailsAgent", async () => {
    await assertOutput("autoprocesos-emails", () => AutoprocesosEmailsAgent.instance().run(autoprocesosInput));
  });
  it("AutoprocesosOptimizadorAgent", async () => {
    await assertOutput("autoprocesos-optimizador", () => AutoprocesosOptimizadorAgent.instance().run(autoprocesosInput));
  });
});
