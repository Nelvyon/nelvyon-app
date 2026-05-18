import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-legal-notice";

export class PaymentLegalNoticeAgent {
  private static inst: PaymentLegalNoticeAgent | undefined;

  static get instance(): PaymentLegalNoticeAgent {
    if (!PaymentLegalNoticeAgent.inst) PaymentLegalNoticeAgent.inst = new PaymentLegalNoticeAgent();
    return PaymentLegalNoticeAgent.inst;
  }

  static reset(): void {
    PaymentLegalNoticeAgent.inst = undefined;
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
          "ROLE: Collections legal drafting assistant top 1%; plantillas revisables por abogado local.",
        mission:
          "Genera aviso de deuda con lenguaje formal por jurisdicción genérica (ES) y disclaimer de revisión legal.",
        fewShotExample:
          "Input: sector servicios. Output JSON: nextAction envío burofax opcional; messages cláusulas marco.",
      },
      input,
    );
  }
}

export function getPaymentLegalNoticeAgent(): PaymentLegalNoticeAgent {
  return PaymentLegalNoticeAgent.instance;
}

export function resetPaymentLegalNoticeAgentForTests(): void {
  PaymentLegalNoticeAgent.reset();
}
