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
  PaymentDunningSequenceAgent,
  PaymentEscalationAgent,
  PaymentFirmNoticeAgent,
  PaymentLegalNoticeAgent,
  PaymentRecoveryOfferAgent,
  PaymentRiskProfilerAgent,
  PaymentSoftReminderAgent,
  PaymentWinbackAgent,
  resetAllPaymentAgentsForTests,
} from "../sectors/payment";

const PAYMENT_JSON = JSON.stringify({
  content: "RECOVER: Risk, Escalate, Communicate, Options, Value, Engage, Resolve aplicado.",
  score: 84,
  nextAction: "Enviar recordatorio D3 con enlace de pago y opción de plan de cuotas.",
  messages: ["Asunto: Factura pendiente — acción en 48h", "Cuerpo: resumen importe y método de pago"],
});

const paymentInput = {
  userId: "00000000-0000-0000-0000-00000000bbee",
  sector: "saas",
  clientName: "Acme Labs",
  amountDue: "490 EUR",
  daysPastDue: 12,
  previousAttempts: 2,
  planType: "pro",
};

describe("Payment agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PAYMENT_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllPaymentAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertPaymentOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      nextAction: string;
      messages: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(typeof out.nextAction).toBe("string");
    expect(out.nextAction.length).toBeGreaterThan(0);
    expect(out.messages.length).toBeGreaterThanOrEqual(1);
  }

  it("PaymentDunningSequenceAgent", async () => {
    await assertPaymentOutput("payment-dunning-sequence", () => PaymentDunningSequenceAgent.instance.run(paymentInput));
  });

  it("PaymentSoftReminderAgent", async () => {
    await assertPaymentOutput("payment-soft-reminder", () => PaymentSoftReminderAgent.instance.run(paymentInput));
  });

  it("PaymentFirmNoticeAgent", async () => {
    await assertPaymentOutput("payment-firm-notice", () => PaymentFirmNoticeAgent.instance.run(paymentInput));
  });

  it("PaymentRecoveryOfferAgent", async () => {
    await assertPaymentOutput("payment-recovery-offer", () => PaymentRecoveryOfferAgent.instance.run(paymentInput));
  });

  it("PaymentEscalationAgent", async () => {
    await assertPaymentOutput("payment-escalation", () => PaymentEscalationAgent.instance.run(paymentInput));
  });

  it("PaymentWinbackAgent", async () => {
    await assertPaymentOutput("payment-winback", () => PaymentWinbackAgent.instance.run(paymentInput));
  });

  it("PaymentRiskProfilerAgent", async () => {
    await assertPaymentOutput("payment-risk-profiler", () => PaymentRiskProfilerAgent.instance.run(paymentInput));
  });

  it("PaymentLegalNoticeAgent", async () => {
    await assertPaymentOutput("payment-legal-notice", () => PaymentLegalNoticeAgent.instance.run(paymentInput));
  });
});
