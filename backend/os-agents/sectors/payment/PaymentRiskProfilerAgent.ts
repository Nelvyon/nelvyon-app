import type { ILlmClient } from "../../LlmClient";
import type { PaymentInput, PaymentOutput } from "./shared";
import { getDefaultPaymentLlm, runPaymentAgentCore } from "./shared";

const AGENT_ID = "payment-risk-profiler";

export class PaymentRiskProfilerAgent {
  private static inst: PaymentRiskProfilerAgent | undefined;

  static get instance(): PaymentRiskProfilerAgent {
    if (!PaymentRiskProfilerAgent.inst) PaymentRiskProfilerAgent.inst = new PaymentRiskProfilerAgent();
    return PaymentRiskProfilerAgent.inst;
  }

  static reset(): void {
    PaymentRiskProfilerAgent.inst = undefined;
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
          "ROLE: Credit risk signals analyst top 1%; scoring cualitativo sin sesgos protegidos.",
        mission:
          "Analiza perfil de riesgo de impago con señales del brief y sugiere acción preventiva temprana.",
        fewShotExample:
          "Input: retrasos recurrentes. Output JSON: nextAction alerta CSM; messages playbook suave.",
      },
      input,
    );
  }
}

export function getPaymentRiskProfilerAgent(): PaymentRiskProfilerAgent {
  return PaymentRiskProfilerAgent.instance;
}

export function resetPaymentRiskProfilerAgentForTests(): void {
  PaymentRiskProfilerAgent.reset();
}
