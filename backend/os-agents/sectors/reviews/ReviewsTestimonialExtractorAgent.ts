import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-testimonial-extractor";

export class ReviewsTestimonialExtractorAgent {
  private static inst: ReviewsTestimonialExtractorAgent | undefined;

  static get instance(): ReviewsTestimonialExtractorAgent {
    if (!ReviewsTestimonialExtractorAgent.inst) ReviewsTestimonialExtractorAgent.inst = new ReviewsTestimonialExtractorAgent();
    return ReviewsTestimonialExtractorAgent.inst;
  }

  static reset(): void {
    ReviewsTestimonialExtractorAgent.inst = undefined;
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
          "ROLE: Copy de conversión y social proof top 1%; extraes citas potentes sin tergiversar.",
        mission:
          "Extrae testimonio de alto impacto (titular + cuerpo corto) y variantes para landing/ads respetando tono legal.",
        fewShotExample: `Input: reseña larga con resultado cuantificable “ahorré 8h/semana”.
Output JSON: headline + quote card; sentiment positive; acciones permiso de uso y nombre anonimizado.`,
      },
      input,
    );
  }
}

export function getReviewsTestimonialExtractorAgent(): ReviewsTestimonialExtractorAgent {
  return ReviewsTestimonialExtractorAgent.instance;
}

export function resetReviewsTestimonialExtractorAgentForTests(): void {
  ReviewsTestimonialExtractorAgent.reset();
}
