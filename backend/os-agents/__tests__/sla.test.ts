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
  SlaClientNotificationAgent,
  SlaCompensationCalculatorAgent,
  SlaEscalationProtocolAgent,
  SlaIncidentClassifierAgent,
  SlaPostmortemAgent,
  SlaReputationRepairAgent,
  SlaRootCauseAgent,
  SlaUptimeMonitorAgent,
  resetAllSlaAgentsForTests,
} from "../sectors/sla";

const SLA_JSON = JSON.stringify({
  content: "RESOLVE: Recognize, Escalate, Solve, Own, Learn, Verify, Ensure aplicado.",
  score: 87,
  compensationOffer: "Crédito del 8% sobre factura mensual por breach < 99.9% según anexo SLA.",
  communications: ["Status: investigando — update en 30 min", "Email cliente: impacto parcial en webhooks"],
});

const slaInput = {
  userId: "00000000-0000-0000-0000-00000000ccff",
  sector: "saas",
  incidentType: "api_outage_partial",
  downtimeMinutes: 42,
  affectedFeatures: ["auth", "webhooks"],
  planType: "enterprise",
};

describe("SLA agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SLA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSlaAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertSlaOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      compensationOffer: string;
      communications: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(typeof out.compensationOffer).toBe("string");
    expect(out.compensationOffer.length).toBeGreaterThan(0);
    expect(out.communications.length).toBeGreaterThanOrEqual(1);
  }

  it("SlaIncidentClassifierAgent", async () => {
    await assertSlaOutput("sla-incident-classifier", () => SlaIncidentClassifierAgent.instance.run(slaInput));
  });

  it("SlaUptimeMonitorAgent", async () => {
    await assertSlaOutput("sla-uptime-monitor", () => SlaUptimeMonitorAgent.instance.run(slaInput));
  });

  it("SlaClientNotificationAgent", async () => {
    await assertSlaOutput("sla-client-notification", () => SlaClientNotificationAgent.instance.run(slaInput));
  });

  it("SlaCompensationCalculatorAgent", async () => {
    await assertSlaOutput("sla-compensation-calculator", () => SlaCompensationCalculatorAgent.instance.run(slaInput));
  });

  it("SlaPostmortemAgent", async () => {
    await assertSlaOutput("sla-postmortem", () => SlaPostmortemAgent.instance.run(slaInput));
  });

  it("SlaEscalationProtocolAgent", async () => {
    await assertSlaOutput("sla-escalation-protocol", () => SlaEscalationProtocolAgent.instance.run(slaInput));
  });

  it("SlaRootCauseAgent", async () => {
    await assertSlaOutput("sla-root-cause", () => SlaRootCauseAgent.instance.run(slaInput));
  });

  it("SlaReputationRepairAgent", async () => {
    await assertSlaOutput("sla-reputation-repair", () => SlaReputationRepairAgent.instance.run(slaInput));
  });
});
