import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-escalation";

export class PaymentEscalationAgent {
  private static inst: PaymentEscalationAgent | undefined;

  static get instance(): PaymentEscalationAgent {
    if (!PaymentEscalationAgent.inst) PaymentEscalationAgent.inst = new PaymentEscalationAgent();
    return PaymentEscalationAgent.inst;
  }

  static reset(): void {
    PaymentEscalationAgent.inst = undefined;
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
          "ROLE: Final escalation comms lead top 1%; última oportunidad antes de suspensión.",
        mission:
          "Genera comunicación de escalación final: suspensión de servicio, plazo perentorio y opciones.",
        fewShotExample:
          "Input: mora crítica. Output JSON: nextAction notice T+48h; messages tono ejecutivo.",
      },
      input,
    );
  }
}

export function getPaymentEscalationAgent(): PaymentEscalationAgent {
  return PaymentEscalationAgent.instance;
}

export function resetPaymentEscalationAgentForTests(): void {
  PaymentEscalationAgent.reset();
}
