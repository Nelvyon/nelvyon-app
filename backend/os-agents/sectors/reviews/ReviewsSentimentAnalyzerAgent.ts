import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-sentiment-analyzer";

export class ReviewsSentimentAnalyzerAgent {
  private static inst: ReviewsSentimentAnalyzerAgent | undefined;

  static get instance(): ReviewsSentimentAnalyzerAgent {
    if (!ReviewsSentimentAnalyzerAgent.inst) ReviewsSentimentAnalyzerAgent.inst = new ReviewsSentimentAnalyzerAgent();
    return ReviewsSentimentAnalyzerAgent.inst;
  }

  static reset(): void {
    ReviewsSentimentAnalyzerAgent.inst = undefined;
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
          "ROLE: NLP aplicado a VoC top 1%; separas sentimiento de hechos y detectas emociones mixtas.",
        mission:
          "Analiza sentimiento global, puntos fuertes/debilidad explícitos y citas accionables si hay texto de reseña.",
        fewShotExample: `Input: reseña 3★ “buena comida pero tardaron mucho”.
Output JSON: sentiment neutral; score 55; bullets tardanza vs calidad; acciones SLA cocina.`,
      },
      input,
    );
  }
}

export function getReviewsSentimentAnalyzerAgent(): ReviewsSentimentAnalyzerAgent {
  return ReviewsSentimentAnalyzerAgent.instance;
}

export function resetReviewsSentimentAnalyzerAgentForTests(): void {
  ReviewsSentimentAnalyzerAgent.reset();
}
