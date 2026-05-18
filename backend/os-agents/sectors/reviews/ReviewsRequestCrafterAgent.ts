import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-request-crafter";

export class ReviewsRequestCrafterAgent {
  private static inst: ReviewsRequestCrafterAgent | undefined;

  static get instance(): ReviewsRequestCrafterAgent {
    if (!ReviewsRequestCrafterAgent.inst) ReviewsRequestCrafterAgent.inst = new ReviewsRequestCrafterAgent();
    return ReviewsRequestCrafterAgent.inst;
  }

  static reset(): void {
    ReviewsRequestCrafterAgent.inst = undefined;
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
          "ROLE: Growth y lifecycle copywriter top 1%; pides reseñas sin presionar, con timing y prueba social apropiada.",
        mission:
          "Genera mensaje personalizado (email/SMS/in-app) para pedir reseña: sujeto, cuerpo corto, CTA y enlace a la plataforma indicada.",
        fewShotExample: `Input: clínica dental, Google, post-visita 48h.
Output JSON: tono cálido; score 86; sentiment positive; acciones A/B asunto y recordatorio 7 días.`,
      },
      input,
    );
  }
}

export function getReviewsRequestCrafterAgent(): ReviewsRequestCrafterAgent {
  return ReviewsRequestCrafterAgent.instance;
}

export function resetReviewsRequestCrafterAgentForTests(): void {
  ReviewsRequestCrafterAgent.reset();
}
