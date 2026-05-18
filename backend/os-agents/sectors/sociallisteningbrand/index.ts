import { SocialListeningBrandCompetitorAgent } from "./SocialListeningBrandCompetitorAgent";
import { SocialListeningBrandCrisisAgent } from "./SocialListeningBrandCrisisAgent";
import { SocialListeningBrandInfluencerAgent } from "./SocialListeningBrandInfluencerAgent";
import { SocialListeningBrandInsightsAgent } from "./SocialListeningBrandInsightsAgent";
import { SocialListeningBrandMonitorAgent } from "./SocialListeningBrandMonitorAgent";
import { SocialListeningBrandReportAgent } from "./SocialListeningBrandReportAgent";
import { SocialListeningBrandSentimentAgent } from "./SocialListeningBrandSentimentAgent";
import { SocialListeningBrandTrendAgent } from "./SocialListeningBrandTrendAgent";

export type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
export {
  parseSocialListeningBrandLlmJson,
  buildSocialListeningBrandPrompt,
  llmOpts as sociallisteningbrandLlmOpts,
} from "./shared";

export {
  SocialListeningBrandMonitorAgent,
  getSocialListeningBrandMonitorAgent,
  resetSocialListeningBrandMonitorAgentForTests,
} from "./SocialListeningBrandMonitorAgent";
export {
  SocialListeningBrandSentimentAgent,
  getSocialListeningBrandSentimentAgent,
  resetSocialListeningBrandSentimentAgentForTests,
} from "./SocialListeningBrandSentimentAgent";
export {
  SocialListeningBrandCompetitorAgent,
  getSocialListeningBrandCompetitorAgent,
  resetSocialListeningBrandCompetitorAgentForTests,
} from "./SocialListeningBrandCompetitorAgent";
export {
  SocialListeningBrandTrendAgent,
  getSocialListeningBrandTrendAgent,
  resetSocialListeningBrandTrendAgentForTests,
} from "./SocialListeningBrandTrendAgent";
export {
  SocialListeningBrandInfluencerAgent,
  getSocialListeningBrandInfluencerAgent,
  resetSocialListeningBrandInfluencerAgentForTests,
} from "./SocialListeningBrandInfluencerAgent";
export {
  SocialListeningBrandCrisisAgent,
  getSocialListeningBrandCrisisAgent,
  resetSocialListeningBrandCrisisAgentForTests,
} from "./SocialListeningBrandCrisisAgent";
export {
  SocialListeningBrandInsightsAgent,
  getSocialListeningBrandInsightsAgent,
  resetSocialListeningBrandInsightsAgentForTests,
} from "./SocialListeningBrandInsightsAgent";
export {
  SocialListeningBrandReportAgent,
  getSocialListeningBrandReportAgent,
  resetSocialListeningBrandReportAgentForTests,
} from "./SocialListeningBrandReportAgent";

export function resetAllSocialListeningBrandAgentsForTests(): void {
  SocialListeningBrandMonitorAgent.reset();
  SocialListeningBrandSentimentAgent.reset();
  SocialListeningBrandCompetitorAgent.reset();
  SocialListeningBrandTrendAgent.reset();
  SocialListeningBrandInfluencerAgent.reset();
  SocialListeningBrandCrisisAgent.reset();
  SocialListeningBrandInsightsAgent.reset();
  SocialListeningBrandReportAgent.reset();
}
