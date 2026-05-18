import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-retention-offer";

export class ChurnRetentionOfferAgent {
  private static inst: ChurnRetentionOfferAgent | undefined;

  static get instance(): ChurnRetentionOfferAgent {
    if (!ChurnRetentionOfferAgent.inst) ChurnRetentionOfferAgent.inst = new ChurnRetentionOfferAgent();
    return ChurnRetentionOfferAgent.inst;
  }

  static reset(): void {
    ChurnRetentionOfferAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChurnLlm();
  }

  async run(input: ChurnInput): Promise<ChurnOutput> {
    return runChurnAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Pricing y retention marketing top 1%; diseñas ofertas éticas que protegen margen y LTV.",
        mission:
          "Genera oferta personalizada de retención (descuento condicionado, extensión de plan, créditos, concierge) con límites y mensaje al cliente.",
        fewShotExample: `Input: amenaza cancelación por precio; uso medio-alto de seats.
Output JSON: oferta “crédito 60 días + lock anual”, riskLevel medium, acciones legal/compliance y umbrales.`,
      },
      input,
    );
  }
}

export function getChurnRetentionOfferAgent(): ChurnRetentionOfferAgent {
  return ChurnRetentionOfferAgent.instance;
}

export function resetChurnRetentionOfferAgentForTests(): void {
  ChurnRetentionOfferAgent.reset();
}
