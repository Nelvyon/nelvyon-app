import { ComparatorBenchmarkAgent } from "./ComparatorBenchmarkAgent";
import { ComparatorMetricsNarratorAgent } from "./ComparatorMetricsNarratorAgent";
import { ComparatorPDFSummaryAgent } from "./ComparatorPDFSummaryAgent";
import { ComparatorROICalculatorAgent } from "./ComparatorROICalculatorAgent";
import { ComparatorSocialShareAgent } from "./ComparatorSocialShareAgent";
import { ComparatorTestimonialMinerAgent } from "./ComparatorTestimonialMinerAgent";
import { ComparatorUpsellTriggerAgent } from "./ComparatorUpsellTriggerAgent";
import { ComparatorVisualStoryAgent } from "./ComparatorVisualStoryAgent";

export type { ComparatorInput, ComparatorOutput } from "./shared";
export { parseComparatorLlmJson, buildTransformPrompt, llmOpts as comparatorLlmOpts } from "./shared";

export {
  ComparatorMetricsNarratorAgent,
  getComparatorMetricsNarratorAgent,
  resetComparatorMetricsNarratorAgentForTests,
} from "./ComparatorMetricsNarratorAgent";
export {
  ComparatorROICalculatorAgent,
  getComparatorROICalculatorAgent,
  resetComparatorROICalculatorAgentForTests,
} from "./ComparatorROICalculatorAgent";
export {
  ComparatorVisualStoryAgent,
  getComparatorVisualStoryAgent,
  resetComparatorVisualStoryAgentForTests,
} from "./ComparatorVisualStoryAgent";
export {
  ComparatorBenchmarkAgent,
  getComparatorBenchmarkAgent,
  resetComparatorBenchmarkAgentForTests,
} from "./ComparatorBenchmarkAgent";
export {
  ComparatorSocialShareAgent,
  getComparatorSocialShareAgent,
  resetComparatorSocialShareAgentForTests,
} from "./ComparatorSocialShareAgent";
export {
  ComparatorPDFSummaryAgent,
  getComparatorPDFSummaryAgent,
  resetComparatorPDFSummaryAgentForTests,
} from "./ComparatorPDFSummaryAgent";
export {
  ComparatorUpsellTriggerAgent,
  getComparatorUpsellTriggerAgent,
  resetComparatorUpsellTriggerAgentForTests,
} from "./ComparatorUpsellTriggerAgent";
export {
  ComparatorTestimonialMinerAgent,
  getComparatorTestimonialMinerAgent,
  resetComparatorTestimonialMinerAgentForTests,
} from "./ComparatorTestimonialMinerAgent";

export function resetAllComparatorAgentsForTests(): void {
  ComparatorMetricsNarratorAgent.reset();
  ComparatorROICalculatorAgent.reset();
  ComparatorVisualStoryAgent.reset();
  ComparatorBenchmarkAgent.reset();
  ComparatorSocialShareAgent.reset();
  ComparatorPDFSummaryAgent.reset();
  ComparatorUpsellTriggerAgent.reset();
  ComparatorTestimonialMinerAgent.reset();
}
