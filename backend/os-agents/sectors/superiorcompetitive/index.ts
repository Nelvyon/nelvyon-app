import { SuperiorCompetitiveAdsAgent } from "./SuperiorCompetitiveAdsAgent";
import { SuperiorCompetitiveAlertAgent } from "./SuperiorCompetitiveAlertAgent";
import { SuperiorCompetitiveBattlecardAgent } from "./SuperiorCompetitiveBattlecardAgent";
import { SuperiorCompetitiveContentAgent } from "./SuperiorCompetitiveContentAgent";
import { SuperiorCompetitivePricingAgent } from "./SuperiorCompetitivePricingAgent";
import { SuperiorCompetitiveReportAgent } from "./SuperiorCompetitiveReportAgent";
import { SuperiorCompetitiveSentimentAgent } from "./SuperiorCompetitiveSentimentAgent";
import { SuperiorCompetitiveTrackerAgent } from "./SuperiorCompetitiveTrackerAgent";

export type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
export {
  parseSuperiorCompetitiveLlmJson,
  buildSuperiorCompetitivePrompt,
  llmOpts as superiorcompetitiveLlmOpts,
} from "./shared";

export {
  SuperiorCompetitiveTrackerAgent,
  getSuperiorCompetitiveTrackerAgent,
  resetSuperiorCompetitiveTrackerAgentForTests,
} from "./SuperiorCompetitiveTrackerAgent";
export {
  SuperiorCompetitiveBattlecardAgent,
  getSuperiorCompetitiveBattlecardAgent,
  resetSuperiorCompetitiveBattlecardAgentForTests,
} from "./SuperiorCompetitiveBattlecardAgent";
export {
  SuperiorCompetitivePricingAgent,
  getSuperiorCompetitivePricingAgent,
  resetSuperiorCompetitivePricingAgentForTests,
} from "./SuperiorCompetitivePricingAgent";
export {
  SuperiorCompetitiveContentAgent,
  getSuperiorCompetitiveContentAgent,
  resetSuperiorCompetitiveContentAgentForTests,
} from "./SuperiorCompetitiveContentAgent";
export {
  SuperiorCompetitiveAdsAgent,
  getSuperiorCompetitiveAdsAgent,
  resetSuperiorCompetitiveAdsAgentForTests,
} from "./SuperiorCompetitiveAdsAgent";
export {
  SuperiorCompetitiveSentimentAgent,
  getSuperiorCompetitiveSentimentAgent,
  resetSuperiorCompetitiveSentimentAgentForTests,
} from "./SuperiorCompetitiveSentimentAgent";
export {
  SuperiorCompetitiveAlertAgent,
  getSuperiorCompetitiveAlertAgent,
  resetSuperiorCompetitiveAlertAgentForTests,
} from "./SuperiorCompetitiveAlertAgent";
export {
  SuperiorCompetitiveReportAgent,
  getSuperiorCompetitiveReportAgent,
  resetSuperiorCompetitiveReportAgentForTests,
} from "./SuperiorCompetitiveReportAgent";

export function resetAllSuperiorCompetitiveAgentsForTests(): void {
  SuperiorCompetitiveTrackerAgent.reset();
  SuperiorCompetitiveBattlecardAgent.reset();
  SuperiorCompetitivePricingAgent.reset();
  SuperiorCompetitiveContentAgent.reset();
  SuperiorCompetitiveAdsAgent.reset();
  SuperiorCompetitiveSentimentAgent.reset();
  SuperiorCompetitiveAlertAgent.reset();
  SuperiorCompetitiveReportAgent.reset();
}
