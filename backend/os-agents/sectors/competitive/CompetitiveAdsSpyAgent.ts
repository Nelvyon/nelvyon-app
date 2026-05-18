import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-ads-spy";

export class CompetitiveAdsSpyAgent {
  private static inst: CompetitiveAdsSpyAgent | undefined;

  static get instance(): CompetitiveAdsSpyAgent {
    if (!CompetitiveAdsSpyAgent.inst) {
      CompetitiveAdsSpyAgent.inst = new CompetitiveAdsSpyAgent();
    }
    return CompetitiveAdsSpyAgent.inst;
  }

  static reset(): void {
    CompetitiveAdsSpyAgent.inst = undefined;
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
          "ROLE: Strategist paid media top 1%; extraes narrativas, ofertas y ángulos creativos desde señales públicas de anuncios.",
        mission:
          "Reconstruye hipótesis de mensajes, promesas, pruebas sociales y CTAs que el competidor probablemente testea en paid; contraste con la marca propia.",
        fewShotExample: `Input: App fintech vs competidor con anuncios agresivos de cashback.
Output: JSON con 4 variantes de ángulo inferidas, objeciones cubiertas, score 86, insights sobre prueba A/B de confianza regulatoria.`,
      },
      input,
    );
  }
}

export function getCompetitiveAdsSpyAgent(): CompetitiveAdsSpyAgent {
  return CompetitiveAdsSpyAgent.instance;
}

export function resetCompetitiveAdsSpyAgentForTests(): void {
  CompetitiveAdsSpyAgent.reset();
}
