import { ReferralAnalyticsAgent } from "./ReferralAnalyticsAgent";
import { ReferralCampaignAgent } from "./ReferralCampaignAgent";
import { ReferralCodeGeneratorAgent } from "./ReferralCodeGeneratorAgent";
import { ReferralEmailAgent } from "./ReferralEmailAgent";
import { ReferralFraudDetectorAgent } from "./ReferralFraudDetectorAgent";
import { ReferralLeaderboardAgent } from "./ReferralLeaderboardAgent";
import { ReferralRewardAgent } from "./ReferralRewardAgent";
import { ReferralTrackingAgent } from "./ReferralTrackingAgent";

export type { ReferralInput, ReferralOutput } from "./shared";
export { parseReferralLlmJson, buildReferralPrompt, llmOpts as referralLlmOpts } from "./shared";

export {
  ReferralCodeGeneratorAgent,
  getReferralCodeGeneratorAgent,
  resetReferralCodeGeneratorAgentForTests,
} from "./ReferralCodeGeneratorAgent";
export {
  ReferralTrackingAgent,
  getReferralTrackingAgent,
  resetReferralTrackingAgentForTests,
} from "./ReferralTrackingAgent";
export {
  ReferralRewardAgent,
  getReferralRewardAgent,
  resetReferralRewardAgentForTests,
} from "./ReferralRewardAgent";
export {
  ReferralFraudDetectorAgent,
  getReferralFraudDetectorAgent,
  resetReferralFraudDetectorAgentForTests,
} from "./ReferralFraudDetectorAgent";
export {
  ReferralEmailAgent,
  getReferralEmailAgent,
  resetReferralEmailAgentForTests,
} from "./ReferralEmailAgent";
export {
  ReferralLeaderboardAgent,
  getReferralLeaderboardAgent,
  resetReferralLeaderboardAgentForTests,
} from "./ReferralLeaderboardAgent";
export {
  ReferralAnalyticsAgent,
  getReferralAnalyticsAgent,
  resetReferralAnalyticsAgentForTests,
} from "./ReferralAnalyticsAgent";
export {
  ReferralCampaignAgent,
  getReferralCampaignAgent,
  resetReferralCampaignAgentForTests,
} from "./ReferralCampaignAgent";

export function resetAllReferralAgentsForTests(): void {
  ReferralCodeGeneratorAgent.reset();
  ReferralTrackingAgent.reset();
  ReferralRewardAgent.reset();
  ReferralFraudDetectorAgent.reset();
  ReferralEmailAgent.reset();
  ReferralLeaderboardAgent.reset();
  ReferralAnalyticsAgent.reset();
  ReferralCampaignAgent.reset();
}
