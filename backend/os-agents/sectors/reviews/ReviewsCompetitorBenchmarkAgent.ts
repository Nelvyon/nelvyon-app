import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-competitor-benchmark";

export class ReviewsCompetitorBenchmarkAgent {
  private static inst: ReviewsCompetitorBenchmarkAgent | undefined;

  static get instance(): ReviewsCompetitorBenchmarkAgent {
    if (!ReviewsCompetitorBenchmarkAgent.inst) ReviewsCompetitorBenchmarkAgent.inst = new ReviewsCompetitorBenchmarkAgent();
    return ReviewsCompetitorBenchmarkAgent.inst;
  }

  static reset(): void {
    ReviewsCompetitorBenchmarkAgent.inst = undefined;
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
          "ROLE: Competitive intelligence aplicado a reputación top 1%; contrastas posicionamiento percibido sin datos inventados.",
        mission:
          "Compara señales de reseñas propias vs competidor (usa platform/reviewText como proxy si describe ambos); gaps y ventanas tácticas.",
        fewShotExample: `Input: sector retail; texto menciona rival con mejor “stock online”.
Output JSON: brecha omnicanal; sentiment neutral; acciones inventario tiempo real.`,
      },
      input,
    );
  }
}

export function getReviewsCompetitorBenchmarkAgent(): ReviewsCompetitorBenchmarkAgent {
  return ReviewsCompetitorBenchmarkAgent.instance;
}

export function resetReviewsCompetitorBenchmarkAgentForTests(): void {
  ReviewsCompetitorBenchmarkAgent.reset();
}
