import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-review-miner";

export class CompetitiveReviewMinerAgent {
  private static inst: CompetitiveReviewMinerAgent | undefined;

  static get instance(): CompetitiveReviewMinerAgent {
    if (!CompetitiveReviewMinerAgent.inst) {
      CompetitiveReviewMinerAgent.inst = new CompetitiveReviewMinerAgent();
    }
    return CompetitiveReviewMinerAgent.inst;
  }

  static reset(): void {
    CompetitiveReviewMinerAgent.inst = undefined;
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
          "ROLE: VoC y research cualitativo top 1%; sintetizas pain points, delighters y riesgos reputacionales desde reseñas públicas típicas del sector.",
        mission:
          "Extrae temas recurrentes que los clientes atribuyen al competidor (fortalezas débiles, fricciones) y tradúcelo en ventajas tácticas para la marca propia.",
        fewShotExample: `Input: Marketplace servicios vs competidor con quejas de soporte lento.
Output: JSON con taxonomía de temas, severidad inferida, score 87, insights sobre SLA visibles y onboarding asistido.`,
      },
      input,
    );
  }
}

export function getCompetitiveReviewMinerAgent(): CompetitiveReviewMinerAgent {
  return CompetitiveReviewMinerAgent.instance;
}

export function resetCompetitiveReviewMinerAgentForTests(): void {
  CompetitiveReviewMinerAgent.reset();
}
