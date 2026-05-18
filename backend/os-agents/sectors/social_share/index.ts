import { SocialShareAnalyticsAgent } from "./SocialShareAnalyticsAgent";
import { SocialShareCopyAgent } from "./SocialShareCopyAgent";
import { SocialShareCTAAgent } from "./SocialShareCTAAgent";
import { SocialShareImageAgent } from "./SocialShareImageAgent";
import { SocialShareSchedulerAgent } from "./SocialShareSchedulerAgent";
import { SocialShareTemplateAgent } from "./SocialShareTemplateAgent";
import { SocialShareTrackerAgent } from "./SocialShareTrackerAgent";
import { SocialShareViralAgent } from "./SocialShareViralAgent";

export type { SocialShareInput, SocialShareOutput } from "./shared";
export { parseSocialShareLlmJson, buildSocialSharePrompt, llmOpts as socialShareLlmOpts } from "./shared";

export {
  SocialShareImageAgent,
  getSocialShareImageAgent,
  resetSocialShareImageAgentForTests,
} from "./SocialShareImageAgent";
export {
  SocialShareCopyAgent,
  getSocialShareCopyAgent,
  resetSocialShareCopyAgentForTests,
} from "./SocialShareCopyAgent";
export {
  SocialShareSchedulerAgent,
  getSocialShareSchedulerAgent,
  resetSocialShareSchedulerAgentForTests,
} from "./SocialShareSchedulerAgent";
export {
  SocialShareTrackerAgent,
  getSocialShareTrackerAgent,
  resetSocialShareTrackerAgentForTests,
} from "./SocialShareTrackerAgent";
export {
  SocialShareViralAgent,
  getSocialShareViralAgent,
  resetSocialShareViralAgentForTests,
} from "./SocialShareViralAgent";
export {
  SocialShareTemplateAgent,
  getSocialShareTemplateAgent,
  resetSocialShareTemplateAgentForTests,
} from "./SocialShareTemplateAgent";
export {
  SocialShareAnalyticsAgent,
  getSocialShareAnalyticsAgent,
  resetSocialShareAnalyticsAgentForTests,
} from "./SocialShareAnalyticsAgent";
export {
  SocialShareCTAAgent,
  getSocialShareCTAAgent,
  resetSocialShareCTAAgentForTests,
} from "./SocialShareCTAAgent";

export function resetAllSocialShareAgentsForTests(): void {
  SocialShareImageAgent.reset();
  SocialShareCopyAgent.reset();
  SocialShareSchedulerAgent.reset();
  SocialShareTrackerAgent.reset();
  SocialShareViralAgent.reset();
  SocialShareTemplateAgent.reset();
  SocialShareAnalyticsAgent.reset();
  SocialShareCTAAgent.reset();
}
