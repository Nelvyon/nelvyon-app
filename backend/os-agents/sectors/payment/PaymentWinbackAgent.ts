import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-winback";

export class PaymentWinbackAgent {
  private static inst: PaymentWinbackAgent | undefined;

  static get instance(): PaymentWinbackAgent {
    if (!PaymentWinbackAgent.inst) PaymentWinbackAgent.inst = new PaymentWinbackAgent();
    return PaymentWinbackAgent.inst;
  }

  static reset(): void {
    PaymentWinbackAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPaymentLlm();
  }

  async run(input: PaymentInput): Promise<PaymentOutput> {
    return runPaymentAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Reactivation lifecycle writer top 1%; bienvenida tras regularizar.",
        mission:
          "Redacta secuencia de reactivación tras resolución del impago: agradecimiento, valor y guardrails.",
        fewShotExample:
          "Input: pago recibido. Output JSON: nextAction D0 email; messages D3 check-in producto.",
      },
      input,
    );
  }
}

export function getPaymentWinbackAgent(): PaymentWinbackAgent {
  return PaymentWinbackAgent.instance;
}

export function resetPaymentWinbackAgentForTests(): void {
  PaymentWinbackAgent.reset();
}
