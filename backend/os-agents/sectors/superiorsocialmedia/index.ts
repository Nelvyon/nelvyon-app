import { SuperiorSocialMediaAdsAgent } from "./SuperiorSocialMediaAdsAgent";
import { SuperiorSocialMediaAnalyticsAgent } from "./SuperiorSocialMediaAnalyticsAgent";
import { SuperiorSocialMediaCopyAgent } from "./SuperiorSocialMediaCopyAgent";
import { SuperiorSocialMediaInfluencerAgent } from "./SuperiorSocialMediaInfluencerAgent";
import { SuperiorSocialMediaListeningAgent } from "./SuperiorSocialMediaListeningAgent";
import { SuperiorSocialMediaSchedulerAgent } from "./SuperiorSocialMediaSchedulerAgent";
import { SuperiorSocialMediaStrategyAgent } from "./SuperiorSocialMediaStrategyAgent";
import { SuperiorSocialMediaViralAgent } from "./SuperiorSocialMediaViralAgent";

export type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
export {
  parseSuperiorSocialMediaLlmJson,
  buildSuperiorSocialMediaPrompt,
  llmOpts as superiorsocialmediaLlmOpts,
} from "./shared";

export {
  SuperiorSocialMediaStrategyAgent,
  getSuperiorSocialMediaStrategyAgent,
  resetSuperiorSocialMediaStrategyAgentForTests,
} from "./SuperiorSocialMediaStrategyAgent";
export {
  SuperiorSocialMediaCopyAgent,
  getSuperiorSocialMediaCopyAgent,
  resetSuperiorSocialMediaCopyAgentForTests,
} from "./SuperiorSocialMediaCopyAgent";
export {
  SuperiorSocialMediaAnalyticsAgent,
  getSuperiorSocialMediaAnalyticsAgent,
  resetSuperiorSocialMediaAnalyticsAgentForTests,
} from "./SuperiorSocialMediaAnalyticsAgent";
export {
  SuperiorSocialMediaSchedulerAgent,
  getSuperiorSocialMediaSchedulerAgent,
  resetSuperiorSocialMediaSchedulerAgentForTests,
} from "./SuperiorSocialMediaSchedulerAgent";
export {
  SuperiorSocialMediaAdsAgent,
  getSuperiorSocialMediaAdsAgent,
  resetSuperiorSocialMediaAdsAgentForTests,
} from "./SuperiorSocialMediaAdsAgent";
export {
  SuperiorSocialMediaListeningAgent,
  getSuperiorSocialMediaListeningAgent,
  resetSuperiorSocialMediaListeningAgentForTests,
} from "./SuperiorSocialMediaListeningAgent";
export {
  SuperiorSocialMediaInfluencerAgent,
  getSuperiorSocialMediaInfluencerAgent,
  resetSuperiorSocialMediaInfluencerAgentForTests,
} from "./SuperiorSocialMediaInfluencerAgent";
export {
  SuperiorSocialMediaViralAgent,
  getSuperiorSocialMediaViralAgent,
  resetSuperiorSocialMediaViralAgentForTests,
} from "./SuperiorSocialMediaViralAgent";

export function resetAllSuperiorSocialMediaAgentsForTests(): void {
  SuperiorSocialMediaStrategyAgent.reset();
  SuperiorSocialMediaCopyAgent.reset();
  SuperiorSocialMediaAnalyticsAgent.reset();
  SuperiorSocialMediaSchedulerAgent.reset();
  SuperiorSocialMediaAdsAgent.reset();
  SuperiorSocialMediaListeningAgent.reset();
  SuperiorSocialMediaInfluencerAgent.reset();
  SuperiorSocialMediaViralAgent.reset();
}
