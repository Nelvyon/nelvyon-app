import { TestimonialsCaseStudyBuilderAgent } from "./TestimonialsCaseStudyBuilderAgent";
import { TestimonialsComparisonAgent } from "./TestimonialsComparisonAgent";
import { TestimonialsDistributionAgent } from "./TestimonialsDistributionAgent";
import { TestimonialsOutreachRequestAgent } from "./TestimonialsOutreachRequestAgent";
import { TestimonialsQuoteExtractorAgent } from "./TestimonialsQuoteExtractorAgent";
import { TestimonialsROICalculatorAgent } from "./TestimonialsROICalculatorAgent";
import { TestimonialsSocialProofAgent } from "./TestimonialsSocialProofAgent";
import { TestimonialsVideoScriptAgent } from "./TestimonialsVideoScriptAgent";

export type { TestimonialsInput, TestimonialsOutput } from "./shared";
export { parseTestimonialsLlmJson, buildProofPrompt, llmOpts as testimonialsLlmOpts } from "./shared";

export {
  TestimonialsCaseStudyBuilderAgent,
  getTestimonialsCaseStudyBuilderAgent,
  resetTestimonialsCaseStudyBuilderAgentForTests,
} from "./TestimonialsCaseStudyBuilderAgent";
export {
  TestimonialsQuoteExtractorAgent,
  getTestimonialsQuoteExtractorAgent,
  resetTestimonialsQuoteExtractorAgentForTests,
} from "./TestimonialsQuoteExtractorAgent";
export {
  TestimonialsVideoScriptAgent,
  getTestimonialsVideoScriptAgent,
  resetTestimonialsVideoScriptAgentForTests,
} from "./TestimonialsVideoScriptAgent";
export {
  TestimonialsSocialProofAgent,
  getTestimonialsSocialProofAgent,
  resetTestimonialsSocialProofAgentForTests,
} from "./TestimonialsSocialProofAgent";
export {
  TestimonialsOutreachRequestAgent,
  getTestimonialsOutreachRequestAgent,
  resetTestimonialsOutreachRequestAgentForTests,
} from "./TestimonialsOutreachRequestAgent";
export {
  TestimonialsROICalculatorAgent,
  getTestimonialsROICalculatorAgent,
  resetTestimonialsROICalculatorAgentForTests,
} from "./TestimonialsROICalculatorAgent";
export {
  TestimonialsComparisonAgent,
  getTestimonialsComparisonAgent,
  resetTestimonialsComparisonAgentForTests,
} from "./TestimonialsComparisonAgent";
export {
  TestimonialsDistributionAgent,
  getTestimonialsDistributionAgent,
  resetTestimonialsDistributionAgentForTests,
} from "./TestimonialsDistributionAgent";

export function resetAllTestimonialsAgentsForTests(): void {
  TestimonialsCaseStudyBuilderAgent.reset();
  TestimonialsQuoteExtractorAgent.reset();
  TestimonialsVideoScriptAgent.reset();
  TestimonialsSocialProofAgent.reset();
  TestimonialsOutreachRequestAgent.reset();
  TestimonialsROICalculatorAgent.reset();
  TestimonialsComparisonAgent.reset();
  TestimonialsDistributionAgent.reset();
}
