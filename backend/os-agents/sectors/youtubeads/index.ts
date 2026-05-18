import { YouTubeAdsAnalyticsAgent } from "./YouTubeAdsAnalyticsAgent";
import { YouTubeAdsAudienceAgent } from "./YouTubeAdsAudienceAgent";
import { YouTubeAdsAuthAgent } from "./YouTubeAdsAuthAgent";
import { YouTubeAdsBidAgent } from "./YouTubeAdsBidAgent";
import { YouTubeAdsCampaignAgent } from "./YouTubeAdsCampaignAgent";
import { YouTubeAdsReportAgent } from "./YouTubeAdsReportAgent";
import { YouTubeAdsScriptAgent } from "./YouTubeAdsScriptAgent";
import { YouTubeAdsThumbnailAgent } from "./YouTubeAdsThumbnailAgent";

export type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
export { parseYouTubeAdsLlmJson, buildYouTubeAdsPrompt, llmOpts as youTubeAdsLlmOpts } from "./shared";

export {
  YouTubeAdsAuthAgent,
  getYouTubeAdsAuthAgent,
  resetYouTubeAdsAuthAgentForTests,
} from "./YouTubeAdsAuthAgent";
export {
  YouTubeAdsCampaignAgent,
  getYouTubeAdsCampaignAgent,
  resetYouTubeAdsCampaignAgentForTests,
} from "./YouTubeAdsCampaignAgent";
export {
  YouTubeAdsScriptAgent,
  getYouTubeAdsScriptAgent,
  resetYouTubeAdsScriptAgentForTests,
} from "./YouTubeAdsScriptAgent";
export {
  YouTubeAdsAudienceAgent,
  getYouTubeAdsAudienceAgent,
  resetYouTubeAdsAudienceAgentForTests,
} from "./YouTubeAdsAudienceAgent";
export {
  YouTubeAdsBidAgent,
  getYouTubeAdsBidAgent,
  resetYouTubeAdsBidAgentForTests,
} from "./YouTubeAdsBidAgent";
export {
  YouTubeAdsThumbnailAgent,
  getYouTubeAdsThumbnailAgent,
  resetYouTubeAdsThumbnailAgentForTests,
} from "./YouTubeAdsThumbnailAgent";
export {
  YouTubeAdsReportAgent,
  getYouTubeAdsReportAgent,
  resetYouTubeAdsReportAgentForTests,
} from "./YouTubeAdsReportAgent";
export {
  YouTubeAdsAnalyticsAgent,
  getYouTubeAdsAnalyticsAgent,
  resetYouTubeAdsAnalyticsAgentForTests,
} from "./YouTubeAdsAnalyticsAgent";

export function resetAllYouTubeAdsAgentsForTests(): void {
  YouTubeAdsAuthAgent.reset();
  YouTubeAdsCampaignAgent.reset();
  YouTubeAdsScriptAgent.reset();
  YouTubeAdsAudienceAgent.reset();
  YouTubeAdsBidAgent.reset();
  YouTubeAdsThumbnailAgent.reset();
  YouTubeAdsReportAgent.reset();
  YouTubeAdsAnalyticsAgent.reset();
}
