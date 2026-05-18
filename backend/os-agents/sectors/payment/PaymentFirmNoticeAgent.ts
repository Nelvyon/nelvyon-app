import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-firm-notice";

export class PaymentFirmNoticeAgent {
  private static inst: PaymentFirmNoticeAgent | undefined;

  static get instance(): PaymentFirmNoticeAgent {
    if (!PaymentFirmNoticeAgent.inst) PaymentFirmNoticeAgent.inst = new PaymentFirmNoticeAgent();
    return PaymentFirmNoticeAgent.inst;
  }

  static reset(): void {
    PaymentFirmNoticeAgent.inst = undefined;
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
          "ROLE: Commercial collections counsel top 1%; firmeza sin lenguaje abusivo.",
        mission:
          "Genera aviso formal de impago con plazos, consecuencias contractuales genéricas y vía de respuesta.",
        fewShotExample:
          "Input: mora >14d. Output JSON: nextAction carta formal; messages párrafo clave + anexo datos.",
      },
      input,
    );
  }
}

export function getPaymentFirmNoticeAgent(): PaymentFirmNoticeAgent {
  return PaymentFirmNoticeAgent.instance;
}

export function resetPaymentFirmNoticeAgentForTests(): void {
  PaymentFirmNoticeAgent.reset();
}
