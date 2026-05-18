import { SuperiorReviewsAlertAgent } from "./SuperiorReviewsAlertAgent";
import { SuperiorReviewsCollectorAgent } from "./SuperiorReviewsCollectorAgent";
import { SuperiorReviewsCompetitorAgent } from "./SuperiorReviewsCompetitorAgent";
import { SuperiorReviewsDistributionAgent } from "./SuperiorReviewsDistributionAgent";
import { SuperiorReviewsInsightsAgent } from "./SuperiorReviewsInsightsAgent";
import { SuperiorReviewsReputationAgent } from "./SuperiorReviewsReputationAgent";
import { SuperiorReviewsResponseAgent } from "./SuperiorReviewsResponseAgent";
import { SuperiorReviewsSentimentAgent } from "./SuperiorReviewsSentimentAgent";

export type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
export { parseSuperiorReviewsLlmJson, buildSuperiorReviewsPrompt, llmOpts as superiorreviewsLlmOpts } from "./shared";

export {
  SuperiorReviewsCollectorAgent,
  getSuperiorReviewsCollectorAgent,
  resetSuperiorReviewsCollectorAgentForTests,
} from "./SuperiorReviewsCollectorAgent";
export {
  SuperiorReviewsSentimentAgent,
  getSuperiorReviewsSentimentAgent,
  resetSuperiorReviewsSentimentAgentForTests,
} from "./SuperiorReviewsSentimentAgent";
export {
  SuperiorReviewsResponseAgent,
  getSuperiorReviewsResponseAgent,
  resetSuperiorReviewsResponseAgentForTests,
} from "./SuperiorReviewsResponseAgent";
export {
  SuperiorReviewsAlertAgent,
  getSuperiorReviewsAlertAgent,
  resetSuperiorReviewsAlertAgentForTests,
} from "./SuperiorReviewsAlertAgent";
export {
  SuperiorReviewsDistributionAgent,
  getSuperiorReviewsDistributionAgent,
  resetSuperiorReviewsDistributionAgentForTests,
} from "./SuperiorReviewsDistributionAgent";
export {
  SuperiorReviewsInsightsAgent,
  getSuperiorReviewsInsightsAgent,
  resetSuperiorReviewsInsightsAgentForTests,
} from "./SuperiorReviewsInsightsAgent";
export {
  SuperiorReviewsCompetitorAgent,
  getSuperiorReviewsCompetitorAgent,
  resetSuperiorReviewsCompetitorAgentForTests,
} from "./SuperiorReviewsCompetitorAgent";
export {
  SuperiorReviewsReputationAgent,
  getSuperiorReviewsReputationAgent,
  resetSuperiorReviewsReputationAgentForTests,
} from "./SuperiorReviewsReputationAgent";

export function resetAllSuperiorReviewsAgentsForTests(): void {
  SuperiorReviewsCollectorAgent.reset();
  SuperiorReviewsSentimentAgent.reset();
  SuperiorReviewsResponseAgent.reset();
  SuperiorReviewsAlertAgent.reset();
  SuperiorReviewsDistributionAgent.reset();
  SuperiorReviewsInsightsAgent.reset();
  SuperiorReviewsCompetitorAgent.reset();
  SuperiorReviewsReputationAgent.reset();
}
