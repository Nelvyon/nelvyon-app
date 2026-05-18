import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-dunning-sequence";

export class PaymentDunningSequenceAgent {
  private static inst: PaymentDunningSequenceAgent | undefined;

  static get instance(): PaymentDunningSequenceAgent {
    if (!PaymentDunningSequenceAgent.inst) PaymentDunningSequenceAgent.inst = new PaymentDunningSequenceAgent();
    return PaymentDunningSequenceAgent.inst;
  }

  static reset(): void {
    PaymentDunningSequenceAgent.inst = undefined;
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
          "ROLE: Dunning strategist top 1%; secuencias D1/D3/D7/D14/D30 sin acoso.",
        mission:
          "Genera secuencia dunning completa por perfil: tono, canal y CTA por hito temporal.",
        fewShotExample:
          "Input: mora leve B2B. Output JSON: nextAction activar D3; messages asunto+cuerpo por día.",
      },
      input,
    );
  }
}

export function getPaymentDunningSequenceAgent(): PaymentDunningSequenceAgent {
  return PaymentDunningSequenceAgent.instance;
}

export function resetPaymentDunningSequenceAgentForTests(): void {
  PaymentDunningSequenceAgent.reset();
}
