import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-repair-strategy";

export class ReviewsRepairStrategyAgent {
  private static inst: ReviewsRepairStrategyAgent | undefined;

  static get instance(): ReviewsRepairStrategyAgent {
    if (!ReviewsRepairStrategyAgent.inst) ReviewsRepairStrategyAgent.inst = new ReviewsRepairStrategyAgent();
    return ReviewsRepairStrategyAgent.inst;
  }

  static reset(): void {
    ReviewsRepairStrategyAgent.inst = undefined;
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
          "ROLE: Estratega de reputación y CS ops top 1%; priorizas palancas con ROI reputacional en 30–90 días.",
        mission:
          "Genera plan de mejora reputacional basado en señales de reseñas: quick wins, owners, métricas de seguimiento.",
        fewShotExample: `Input: caída rating por tema envíos.
Output JSON: plan 3 fases; sentiment negative; acciones carrier SLA + política devoluciones visible.`,
      },
      input,
    );
  }
}

export function getReviewsRepairStrategyAgent(): ReviewsRepairStrategyAgent {
  return ReviewsRepairStrategyAgent.instance;
}

export function resetReviewsRepairStrategyAgentForTests(): void {
  ReviewsRepairStrategyAgent.reset();
}
