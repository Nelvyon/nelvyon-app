import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-pattern-insight";

export class ReviewsPatternInsightAgent {
  private static inst: ReviewsPatternInsightAgent | undefined;

  static get instance(): ReviewsPatternInsightAgent {
    if (!ReviewsPatternInsightAgent.inst) ReviewsPatternInsightAgent.inst = new ReviewsPatternInsightAgent();
    return ReviewsPatternInsightAgent.inst;
  }

  static reset(): void {
    ReviewsPatternInsightAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReviewsLlm();
  }

  async run(input: ReviewsInput): Promise<ReviewsOutput> {
    return runReviewsAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: VoC analyst y product insights top 1%; agrupas temas sin sobre-interpretar texto limitado.",
        mission:
          "Detecta patrones/tendencias en el corpus disponible (usa reviewText como muestra o proxy si es único registro).",
        fewShotExample: `Input: varias menciones “personal amable” pero “precios altos”.
Output JSON: patrón precio-percepción; sentiment neutral; acciones bundle y comunicar valor.`,
      },
      input,
    );
  }
}

export function getReviewsPatternInsightAgent(): ReviewsPatternInsightAgent {
  return ReviewsPatternInsightAgent.instance;
}

export function resetReviewsPatternInsightAgentForTests(): void {
  ReviewsPatternInsightAgent.reset();
}
