import { ReviewsCompetitorBenchmarkAgent } from "./ReviewsCompetitorBenchmarkAgent";
import { ReviewsEscalationHandlerAgent } from "./ReviewsEscalationHandlerAgent";
import { ReviewsPatternInsightAgent } from "./ReviewsPatternInsightAgent";
import { ReviewsRepairStrategyAgent } from "./ReviewsRepairStrategyAgent";
import { ReviewsRequestCrafterAgent } from "./ReviewsRequestCrafterAgent";
import { ReviewsResponseGeneratorAgent } from "./ReviewsResponseGeneratorAgent";
import { ReviewsSentimentAnalyzerAgent } from "./ReviewsSentimentAnalyzerAgent";
import { ReviewsTestimonialExtractorAgent } from "./ReviewsTestimonialExtractorAgent";

export type { ReviewsInput, ReviewsOutput, ReviewsSentiment } from "./shared";
export { parseReviewsLlmJson, buildTrustPrompt, reviewsTemperature, llmOpts as reviewsLlmOpts } from "./shared";

export {
  ReviewsRequestCrafterAgent,
  getReviewsRequestCrafterAgent,
  resetReviewsRequestCrafterAgentForTests,
} from "./ReviewsRequestCrafterAgent";
export {
  ReviewsSentimentAnalyzerAgent,
  getReviewsSentimentAnalyzerAgent,
  resetReviewsSentimentAnalyzerAgentForTests,
} from "./ReviewsSentimentAnalyzerAgent";
export {
  ReviewsResponseGeneratorAgent,
  getReviewsResponseGeneratorAgent,
  resetReviewsResponseGeneratorAgentForTests,
} from "./ReviewsResponseGeneratorAgent";
export {
  ReviewsEscalationHandlerAgent,
  getReviewsEscalationHandlerAgent,
  resetReviewsEscalationHandlerAgentForTests,
} from "./ReviewsEscalationHandlerAgent";
export {
  ReviewsPatternInsightAgent,
  getReviewsPatternInsightAgent,
  resetReviewsPatternInsightAgentForTests,
} from "./ReviewsPatternInsightAgent";
export {
  ReviewsCompetitorBenchmarkAgent,
  getReviewsCompetitorBenchmarkAgent,
  resetReviewsCompetitorBenchmarkAgentForTests,
} from "./ReviewsCompetitorBenchmarkAgent";
export {
  ReviewsTestimonialExtractorAgent,
  getReviewsTestimonialExtractorAgent,
  resetReviewsTestimonialExtractorAgentForTests,
} from "./ReviewsTestimonialExtractorAgent";
export {
  ReviewsRepairStrategyAgent,
  getReviewsRepairStrategyAgent,
  resetReviewsRepairStrategyAgentForTests,
} from "./ReviewsRepairStrategyAgent";

export function resetAllReviewsAgentsForTests(): void {
  ReviewsRequestCrafterAgent.reset();
  ReviewsSentimentAnalyzerAgent.reset();
  ReviewsResponseGeneratorAgent.reset();
  ReviewsEscalationHandlerAgent.reset();
  ReviewsPatternInsightAgent.reset();
  ReviewsCompetitorBenchmarkAgent.reset();
  ReviewsTestimonialExtractorAgent.reset();
  ReviewsRepairStrategyAgent.reset();
}
