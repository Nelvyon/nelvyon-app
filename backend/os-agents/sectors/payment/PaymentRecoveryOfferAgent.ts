import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-recovery-offer";

export class PaymentRecoveryOfferAgent {
  private static inst: PaymentRecoveryOfferAgent | undefined;

  static get instance(): PaymentRecoveryOfferAgent {
    if (!PaymentRecoveryOfferAgent.inst) PaymentRecoveryOfferAgent.inst = new PaymentRecoveryOfferAgent();
    return PaymentRecoveryOfferAgent.inst;
  }

  static reset(): void {
    PaymentRecoveryOfferAgent.inst = undefined;
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
          "ROLE: Workout offers designer top 1%; acuerdos sostenibles para ambas partes.",
        mission:
          "Crea oferta de recuperación: plan de pago, descuento pronto pago o pausa temporal con condiciones.",
        fewShotExample:
          "Input: liquidez temporal. Output JSON: nextAction propuesta 3 cuotas; messages email + términos.",
      },
      input,
    );
  }
}

export function getPaymentRecoveryOfferAgent(): PaymentRecoveryOfferAgent {
  return PaymentRecoveryOfferAgent.instance;
}

export function resetPaymentRecoveryOfferAgentForTests(): void {
  PaymentRecoveryOfferAgent.reset();
}
