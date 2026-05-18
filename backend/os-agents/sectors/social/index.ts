import { SocialAnalyticsNarratorAgent } from "./SocialAnalyticsNarratorAgent";
import { SocialCampaignLaunchAgent } from "./SocialCampaignLaunchAgent";
import { SocialCompetitorMonitorAgent } from "./SocialCompetitorMonitorAgent";
import { SocialContentCalendarAgent } from "./SocialContentCalendarAgent";
import { SocialCopywriterAgent } from "./SocialCopywriterAgent";
import { SocialCrisisResponseAgent } from "./SocialCrisisResponseAgent";
import { SocialEngagementHooksAgent } from "./SocialEngagementHooksAgent";
import { SocialHashtagStrategistAgent } from "./SocialHashtagStrategistAgent";
import { SocialStorytellingAgent } from "./SocialStorytellingAgent";

export type { SocialInput, SocialOutput } from "./shared";
export { parseSocialLlmJson, buildEngagePrompt, socialTemperature, llmOpts as socialLlmOpts } from "./shared";

export {
  SocialContentCalendarAgent,
  getSocialContentCalendarAgent,
  resetSocialContentCalendarAgentForTests,
} from "./SocialContentCalendarAgent";
export {
  SocialCopywriterAgent,
  getSocialCopywriterAgent,
  resetSocialCopywriterAgentForTests,
} from "./SocialCopywriterAgent";
export {
  SocialHashtagStrategistAgent,
  getSocialHashtagStrategistAgent,
  resetSocialHashtagStrategistAgentForTests,
} from "./SocialHashtagStrategistAgent";
export {
  SocialEngagementHooksAgent,
  getSocialEngagementHooksAgent,
  resetSocialEngagementHooksAgentForTests,
} from "./SocialEngagementHooksAgent";
export {
  SocialStorytellingAgent,
  getSocialStorytellingAgent,
  resetSocialStorytellingAgentForTests,
} from "./SocialStorytellingAgent";
export {
  SocialCrisisResponseAgent,
  getSocialCrisisResponseAgent,
  resetSocialCrisisResponseAgentForTests,
} from "./SocialCrisisResponseAgent";
export {
  SocialCompetitorMonitorAgent,
  getSocialCompetitorMonitorAgent,
  resetSocialCompetitorMonitorAgentForTests,
} from "./SocialCompetitorMonitorAgent";
export {
  SocialCampaignLaunchAgent,
  getSocialCampaignLaunchAgent,
  resetSocialCampaignLaunchAgentForTests,
} from "./SocialCampaignLaunchAgent";
export {
  SocialAnalyticsNarratorAgent,
  getSocialAnalyticsNarratorAgent,
  resetSocialAnalyticsNarratorAgentForTests,
} from "./SocialAnalyticsNarratorAgent";

export function resetAllSocialAgentsForTests(): void {
  SocialContentCalendarAgent.reset();
  SocialCopywriterAgent.reset();
  SocialHashtagStrategistAgent.reset();
  SocialEngagementHooksAgent.reset();
  SocialStorytellingAgent.reset();
  SocialCrisisResponseAgent.reset();
  SocialCompetitorMonitorAgent.reset();
  SocialCampaignLaunchAgent.reset();
  SocialAnalyticsNarratorAgent.reset();
}
