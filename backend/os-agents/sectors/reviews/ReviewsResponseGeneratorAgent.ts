import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-response-generator";

export class ReviewsResponseGeneratorAgent {
  private static inst: ReviewsResponseGeneratorAgent | undefined;

  static get instance(): ReviewsResponseGeneratorAgent {
    if (!ReviewsResponseGeneratorAgent.inst) ReviewsResponseGeneratorAgent.inst = new ReviewsResponseGeneratorAgent();
    return ReviewsResponseGeneratorAgent.inst;
  }

  static reset(): void {
    ReviewsResponseGeneratorAgent.inst = undefined;
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
          "ROLE: Community manager senior y PR local top 1%; respondes con empatía real y voz de marca consistente.",
        mission:
          "Redacta respuesta pública profesional a la reseña (positiva o negativa): agradecimiento, reconocimiento, siguiente paso.",
        fewShotExample: `Input: reseña negativa por envío roto.
Output JSON: disculpa sin culpar repartidor; score 72; sentiment neutral; acciones reemplazo + ticket interno.`,
      },
      input,
    );
  }
}

export function getReviewsResponseGeneratorAgent(): ReviewsResponseGeneratorAgent {
  return ReviewsResponseGeneratorAgent.instance;
}

export function resetReviewsResponseGeneratorAgentForTests(): void {
  ReviewsResponseGeneratorAgent.reset();
}
