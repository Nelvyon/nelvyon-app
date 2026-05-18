import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-win-loss";

export class CompetitiveWinLossAgent {
  private static inst: CompetitiveWinLossAgent | undefined;

  static get instance(): CompetitiveWinLossAgent {
    if (!CompetitiveWinLossAgent.inst) {
      CompetitiveWinLossAgent.inst = new CompetitiveWinLossAgent();
    }
    return CompetitiveWinLossAgent.inst;
  }

  static reset(): void {
    CompetitiveWinLossAgent.inst = undefined;
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
          "ROLE: Estratega comercial y de producto de élite; diseñas planes win/loss con foco en ejecución y ventaja sostenible.",
        mission:
          "Genera plan concreto para ganar frente al competidor: palancas de producto, mensaje, canal, prueba y métricas de victoria en 30 días.",
        fewShotExample: `Input: SMB software vs incumbente con marca fuerte.
Output: JSON con battlecard accionable, objeciones, prueba pilot, score 90, insights sobre ROI calculator y integración nativa.`,
      },
      input,
    );
  }
}

export function getCompetitiveWinLossAgent(): CompetitiveWinLossAgent {
  return CompetitiveWinLossAgent.instance;
}

export function resetCompetitiveWinLossAgentForTests(): void {
  CompetitiveWinLossAgent.reset();
}
