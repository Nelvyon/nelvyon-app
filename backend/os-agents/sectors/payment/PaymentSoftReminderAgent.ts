import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-soft-reminder";

export class PaymentSoftReminderAgent {
  private static inst: PaymentSoftReminderAgent | undefined;

  static get instance(): PaymentSoftReminderAgent {
    if (!PaymentSoftReminderAgent.inst) PaymentSoftReminderAgent.inst = new PaymentSoftReminderAgent();
    return PaymentSoftReminderAgent.inst;
  }

  static reset(): void {
    PaymentSoftReminderAgent.inst = undefined;
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
          "ROLE: Customer-first collections writer top 1%; recordatorios que preservan relación.",
        mission:
          "Redacta recordatorio amigable de pago vencido: empatía, datos de factura y enlace de pago.",
        fewShotExample:
          "Input: olvido habitual. Output JSON: nextAction email suave; messages 1 variante SMS.",
      },
      input,
    );
  }
}

export function getPaymentSoftReminderAgent(): PaymentSoftReminderAgent {
  return PaymentSoftReminderAgent.instance;
}

export function resetPaymentSoftReminderAgentForTests(): void {
  PaymentSoftReminderAgent.reset();
}
