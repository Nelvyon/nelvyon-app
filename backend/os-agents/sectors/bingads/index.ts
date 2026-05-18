import { BingAdsAdCopyAgent } from "./BingAdsAdCopyAgent";
import { BingAdsAnalyticsAgent } from "./BingAdsAnalyticsAgent";
import { BingAdsAudienceAgent } from "./BingAdsAudienceAgent";
import { BingAdsAuthAgent } from "./BingAdsAuthAgent";
import { BingAdsBidAgent } from "./BingAdsBidAgent";
import { BingAdsCampaignAgent } from "./BingAdsCampaignAgent";
import { BingAdsKeywordAgent } from "./BingAdsKeywordAgent";
import { BingAdsReportAgent } from "./BingAdsReportAgent";

export type { BingAdsInput, BingAdsOutput } from "./shared";
export { parseBingAdsLlmJson, buildBingAdsPrompt, llmOpts as bingAdsLlmOpts } from "./shared";

export {
  BingAdsAuthAgent,
  getBingAdsAuthAgent,
  resetBingAdsAuthAgentForTests,
} from "./BingAdsAuthAgent";
export {
  BingAdsCampaignAgent,
  getBingAdsCampaignAgent,
  resetBingAdsCampaignAgentForTests,
} from "./BingAdsCampaignAgent";
export {
  BingAdsKeywordAgent,
  getBingAdsKeywordAgent,
  resetBingAdsKeywordAgentForTests,
} from "./BingAdsKeywordAgent";
export {
  BingAdsAudienceAgent,
  getBingAdsAudienceAgent,
  resetBingAdsAudienceAgentForTests,
} from "./BingAdsAudienceAgent";
export {
  BingAdsBidAgent,
  getBingAdsBidAgent,
  resetBingAdsBidAgentForTests,
} from "./BingAdsBidAgent";
export {
  BingAdsAdCopyAgent,
  getBingAdsAdCopyAgent,
  resetBingAdsAdCopyAgentForTests,
} from "./BingAdsAdCopyAgent";
export {
  BingAdsReportAgent,
  getBingAdsReportAgent,
  resetBingAdsReportAgentForTests,
} from "./BingAdsReportAgent";
export {
  BingAdsAnalyticsAgent,
  getBingAdsAnalyticsAgent,
  resetBingAdsAnalyticsAgentForTests,
} from "./BingAdsAnalyticsAgent";

export function resetAllBingAdsAgentsForTests(): void {
  BingAdsAuthAgent.reset();
  BingAdsCampaignAgent.reset();
  BingAdsKeywordAgent.reset();
  BingAdsAudienceAgent.reset();
  BingAdsBidAgent.reset();
  BingAdsAdCopyAgent.reset();
  BingAdsReportAgent.reset();
  BingAdsAnalyticsAgent.reset();
}
