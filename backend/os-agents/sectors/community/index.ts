import { CommunityAnalyticsAgent } from "./CommunityAnalyticsAgent";
import { CommunityContentAgent } from "./CommunityContentAgent";
import { CommunityEngagementAgent } from "./CommunityEngagementAgent";
import { CommunityGrowthAgent } from "./CommunityGrowthAgent";
import { CommunityModerationAgent } from "./CommunityModerationAgent";
import { CommunityMonetizationAgent } from "./CommunityMonetizationAgent";
import { CommunityOnboardingAgent } from "./CommunityOnboardingAgent";
import { CommunityRetentionAgent } from "./CommunityRetentionAgent";

export type { CommunityInput, CommunityOutput } from "./shared";
export { parseCommunityLlmJson, buildCommunityPrompt, llmOpts as communityLlmOpts } from "./shared";

export {
  CommunityOnboardingAgent,
  getCommunityOnboardingAgent,
  resetCommunityOnboardingAgentForTests,
} from "./CommunityOnboardingAgent";
export {
  CommunityEngagementAgent,
  getCommunityEngagementAgent,
  resetCommunityEngagementAgentForTests,
} from "./CommunityEngagementAgent";
export {
  CommunityModerationAgent,
  getCommunityModerationAgent,
  resetCommunityModerationAgentForTests,
} from "./CommunityModerationAgent";
export {
  CommunityContentAgent,
  getCommunityContentAgent,
  resetCommunityContentAgentForTests,
} from "./CommunityContentAgent";
export {
  CommunityRetentionAgent,
  getCommunityRetentionAgent,
  resetCommunityRetentionAgentForTests,
} from "./CommunityRetentionAgent";
export {
  CommunityAnalyticsAgent,
  getCommunityAnalyticsAgent,
  resetCommunityAnalyticsAgentForTests,
} from "./CommunityAnalyticsAgent";
export {
  CommunityGrowthAgent,
  getCommunityGrowthAgent,
  resetCommunityGrowthAgentForTests,
} from "./CommunityGrowthAgent";
export {
  CommunityMonetizationAgent,
  getCommunityMonetizationAgent,
  resetCommunityMonetizationAgentForTests,
} from "./CommunityMonetizationAgent";

export function resetAllCommunityAgentsForTests(): void {
  CommunityOnboardingAgent.reset();
  CommunityEngagementAgent.reset();
  CommunityModerationAgent.reset();
  CommunityContentAgent.reset();
  CommunityRetentionAgent.reset();
  CommunityAnalyticsAgent.reset();
  CommunityGrowthAgent.reset();
  CommunityMonetizationAgent.reset();
}
