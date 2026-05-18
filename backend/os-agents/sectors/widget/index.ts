import { WidgetAnalyticsTrackerAgent } from "./WidgetAnalyticsTrackerAgent";
import { WidgetCustomizationAgent } from "./WidgetCustomizationAgent";
import { WidgetLeaderboardEmbedAgent } from "./WidgetLeaderboardEmbedAgent";
import { WidgetLiveCounterAgent } from "./WidgetLiveCounterAgent";
import { WidgetResultsDisplayAgent } from "./WidgetResultsDisplayAgent";
import { WidgetROICalculatorAgent } from "./WidgetROICalculatorAgent";
import { WidgetSocialProofBadgeAgent } from "./WidgetSocialProofBadgeAgent";
import { WidgetTestimonialCarouselAgent } from "./WidgetTestimonialCarouselAgent";

export type { WidgetInput, WidgetOutput } from "./shared";
export { parseWidgetLlmJson, buildEmbedPrompt, llmOpts as widgetLlmOpts } from "./shared";

export {
  WidgetResultsDisplayAgent,
  getWidgetResultsDisplayAgent,
  resetWidgetResultsDisplayAgentForTests,
} from "./WidgetResultsDisplayAgent";
export {
  WidgetSocialProofBadgeAgent,
  getWidgetSocialProofBadgeAgent,
  resetWidgetSocialProofBadgeAgentForTests,
} from "./WidgetSocialProofBadgeAgent";
export {
  WidgetLiveCounterAgent,
  getWidgetLiveCounterAgent,
  resetWidgetLiveCounterAgentForTests,
} from "./WidgetLiveCounterAgent";
export {
  WidgetTestimonialCarouselAgent,
  getWidgetTestimonialCarouselAgent,
  resetWidgetTestimonialCarouselAgentForTests,
} from "./WidgetTestimonialCarouselAgent";
export {
  WidgetROICalculatorAgent,
  getWidgetROICalculatorAgent,
  resetWidgetROICalculatorAgentForTests,
} from "./WidgetROICalculatorAgent";
export {
  WidgetLeaderboardEmbedAgent,
  getWidgetLeaderboardEmbedAgent,
  resetWidgetLeaderboardEmbedAgentForTests,
} from "./WidgetLeaderboardEmbedAgent";
export {
  WidgetCustomizationAgent,
  getWidgetCustomizationAgent,
  resetWidgetCustomizationAgentForTests,
} from "./WidgetCustomizationAgent";
export {
  WidgetAnalyticsTrackerAgent,
  getWidgetAnalyticsTrackerAgent,
  resetWidgetAnalyticsTrackerAgentForTests,
} from "./WidgetAnalyticsTrackerAgent";

export function resetAllWidgetAgentsForTests(): void {
  WidgetResultsDisplayAgent.reset();
  WidgetSocialProofBadgeAgent.reset();
  WidgetLiveCounterAgent.reset();
  WidgetTestimonialCarouselAgent.reset();
  WidgetROICalculatorAgent.reset();
  WidgetLeaderboardEmbedAgent.reset();
  WidgetCustomizationAgent.reset();
  WidgetAnalyticsTrackerAgent.reset();
}
