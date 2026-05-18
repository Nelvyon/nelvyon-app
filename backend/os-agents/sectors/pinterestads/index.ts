import { PinterestAdsAnalyticsAgent } from "./PinterestAdsAnalyticsAgent";
import { PinterestAdsAudienceAgent } from "./PinterestAdsAudienceAgent";
import { PinterestAdsAuthAgent } from "./PinterestAdsAuthAgent";
import { PinterestAdsBidAgent } from "./PinterestAdsBidAgent";
import { PinterestAdsCampaignAgent } from "./PinterestAdsCampaignAgent";
import { PinterestAdsKeywordAgent } from "./PinterestAdsKeywordAgent";
import { PinterestAdsPinAgent } from "./PinterestAdsPinAgent";
import { PinterestAdsReportAgent } from "./PinterestAdsReportAgent";

export type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
export { parsePinterestAdsLlmJson, buildPinterestAdsPrompt, llmOpts as pinterestAdsLlmOpts } from "./shared";

export {
  PinterestAdsAuthAgent,
  getPinterestAdsAuthAgent,
  resetPinterestAdsAuthAgentForTests,
} from "./PinterestAdsAuthAgent";
export {
  PinterestAdsCampaignAgent,
  getPinterestAdsCampaignAgent,
  resetPinterestAdsCampaignAgentForTests,
} from "./PinterestAdsCampaignAgent";
export {
  PinterestAdsPinAgent,
  getPinterestAdsPinAgent,
  resetPinterestAdsPinAgentForTests,
} from "./PinterestAdsPinAgent";
export {
  PinterestAdsAudienceAgent,
  getPinterestAdsAudienceAgent,
  resetPinterestAdsAudienceAgentForTests,
} from "./PinterestAdsAudienceAgent";
export {
  PinterestAdsBidAgent,
  getPinterestAdsBidAgent,
  resetPinterestAdsBidAgentForTests,
} from "./PinterestAdsBidAgent";
export {
  PinterestAdsReportAgent,
  getPinterestAdsReportAgent,
  resetPinterestAdsReportAgentForTests,
} from "./PinterestAdsReportAgent";
export {
  PinterestAdsKeywordAgent,
  getPinterestAdsKeywordAgent,
  resetPinterestAdsKeywordAgentForTests,
} from "./PinterestAdsKeywordAgent";
export {
  PinterestAdsAnalyticsAgent,
  getPinterestAdsAnalyticsAgent,
  resetPinterestAdsAnalyticsAgentForTests,
} from "./PinterestAdsAnalyticsAgent";

export function resetAllPinterestAdsAgentsForTests(): void {
  PinterestAdsAuthAgent.reset();
  PinterestAdsCampaignAgent.reset();
  PinterestAdsPinAgent.reset();
  PinterestAdsAudienceAgent.reset();
  PinterestAdsBidAgent.reset();
  PinterestAdsReportAgent.reset();
  PinterestAdsKeywordAgent.reset();
  PinterestAdsAnalyticsAgent.reset();
}
