import { CompetitiveAdsSpyAgent } from "./CompetitiveAdsSpyAgent";
import { CompetitiveBacklinkProfileAgent } from "./CompetitiveBacklinkProfileAgent";
import { CompetitiveContentGapAgent } from "./CompetitiveContentGapAgent";
import { CompetitivePositioningAnalystAgent } from "./CompetitivePositioningAnalystAgent";
import { CompetitivePricingIntelAgent } from "./CompetitivePricingIntelAgent";
import { CompetitiveReviewMinerAgent } from "./CompetitiveReviewMinerAgent";
import { CompetitiveSocialPresenceAgent } from "./CompetitiveSocialPresenceAgent";
import { CompetitiveWinLossAgent } from "./CompetitiveWinLossAgent";

export type { CompetitiveInput, CompetitiveOutput } from "./shared";
export { llmOpts, parseJson, parseCompetitiveLlmJson, buildActPrompt } from "./shared";

export {
  CompetitivePositioningAnalystAgent,
  getCompetitivePositioningAnalystAgent,
  resetCompetitivePositioningAnalystAgentForTests,
} from "./CompetitivePositioningAnalystAgent";
export {
  CompetitiveContentGapAgent,
  getCompetitiveContentGapAgent,
  resetCompetitiveContentGapAgentForTests,
} from "./CompetitiveContentGapAgent";
export {
  CompetitivePricingIntelAgent,
  getCompetitivePricingIntelAgent,
  resetCompetitivePricingIntelAgentForTests,
} from "./CompetitivePricingIntelAgent";
export {
  CompetitiveBacklinkProfileAgent,
  getCompetitiveBacklinkProfileAgent,
  resetCompetitiveBacklinkProfileAgentForTests,
} from "./CompetitiveBacklinkProfileAgent";
export {
  CompetitiveAdsSpyAgent,
  getCompetitiveAdsSpyAgent,
  resetCompetitiveAdsSpyAgentForTests,
} from "./CompetitiveAdsSpyAgent";
export {
  CompetitiveSocialPresenceAgent,
  getCompetitiveSocialPresenceAgent,
  resetCompetitiveSocialPresenceAgentForTests,
} from "./CompetitiveSocialPresenceAgent";
export {
  CompetitiveReviewMinerAgent,
  getCompetitiveReviewMinerAgent,
  resetCompetitiveReviewMinerAgentForTests,
} from "./CompetitiveReviewMinerAgent";
export {
  CompetitiveWinLossAgent,
  getCompetitiveWinLossAgent,
  resetCompetitiveWinLossAgentForTests,
} from "./CompetitiveWinLossAgent";

export function resetAllCompetitiveAgentsForTests(): void {
  CompetitivePositioningAnalystAgent.reset();
  CompetitiveContentGapAgent.reset();
  CompetitivePricingIntelAgent.reset();
  CompetitiveBacklinkProfileAgent.reset();
  CompetitiveAdsSpyAgent.reset();
  CompetitiveSocialPresenceAgent.reset();
  CompetitiveReviewMinerAgent.reset();
  CompetitiveWinLossAgent.reset();
}
