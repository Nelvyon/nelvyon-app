import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-pricing-intel";

export class CompetitivePricingIntelAgent {
  private static inst: CompetitivePricingIntelAgent | undefined;

  static get instance(): CompetitivePricingIntelAgent {
    if (!CompetitivePricingIntelAgent.inst) {
      CompetitivePricingIntelAgent.inst = new CompetitivePricingIntelAgent();
    }
    return CompetitivePricingIntelAgent.inst;
  }

  static reset(): void {
    CompetitivePricingIntelAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCompetitiveLlm();
  }

  async run(input: CompetitiveInput): Promise<CompetitiveOutput> {
    return runCompetitiveAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Estratega de pricing y packaging de élite (SaaS, retail, servicios); infieres lógica de precios públicos y bundles.",
        mission:
          "Inferir hipótesis de estructura de precios/descuentos/demos del competidor, comparar contra propuesta propia y proponer tácticas defensivas y de upside.",
        fewShotExample: `Input: B2B plataforma con pricing por asientos oculto vs competidor lista pública degradada por volumen.
Output: JSON tabla mental de tiers inferidos, anclas de valor, score 82, insights sobre prueba gratuita acotada y fee de onboarding.`,
      },
      input,
    );
  }
}

export function getCompetitivePricingIntelAgent(): CompetitivePricingIntelAgent {
  return CompetitivePricingIntelAgent.instance;
}

export function resetCompetitivePricingIntelAgentForTests(): void {
  CompetitivePricingIntelAgent.reset();
}
