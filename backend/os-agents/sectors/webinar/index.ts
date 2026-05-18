import { WebinarAnalyticsAgent } from "./WebinarAnalyticsAgent";
import { WebinarCreationAgent } from "./WebinarCreationAgent";
import { WebinarEngagementAgent } from "./WebinarEngagementAgent";
import { WebinarFollowUpAgent } from "./WebinarFollowUpAgent";
import { WebinarMonetizationAgent } from "./WebinarMonetizationAgent";
import { WebinarPromotionAgent } from "./WebinarPromotionAgent";
import { WebinarRecordingAgent } from "./WebinarRecordingAgent";
import { WebinarVideoHostingAgent } from "./WebinarVideoHostingAgent";

export type { WebinarInput, WebinarOutput } from "./shared";
export { parseWebinarLlmJson, buildWebinarPrompt, llmOpts as webinarLlmOpts } from "./shared";

export {
  WebinarCreationAgent,
  getWebinarCreationAgent,
  resetWebinarCreationAgentForTests,
} from "./WebinarCreationAgent";
export {
  WebinarPromotionAgent,
  getWebinarPromotionAgent,
  resetWebinarPromotionAgentForTests,
} from "./WebinarPromotionAgent";
export {
  WebinarEngagementAgent,
  getWebinarEngagementAgent,
  resetWebinarEngagementAgentForTests,
} from "./WebinarEngagementAgent";
export {
  WebinarRecordingAgent,
  getWebinarRecordingAgent,
  resetWebinarRecordingAgentForTests,
} from "./WebinarRecordingAgent";
export {
  WebinarMonetizationAgent,
  getWebinarMonetizationAgent,
  resetWebinarMonetizationAgentForTests,
} from "./WebinarMonetizationAgent";
export {
  WebinarAnalyticsAgent,
  getWebinarAnalyticsAgent,
  resetWebinarAnalyticsAgentForTests,
} from "./WebinarAnalyticsAgent";
export {
  WebinarFollowUpAgent,
  getWebinarFollowUpAgent,
  resetWebinarFollowUpAgentForTests,
} from "./WebinarFollowUpAgent";
export {
  WebinarVideoHostingAgent,
  getWebinarVideoHostingAgent,
  resetWebinarVideoHostingAgentForTests,
} from "./WebinarVideoHostingAgent";

export function resetAllWebinarAgentsForTests(): void {
  WebinarCreationAgent.reset();
  WebinarPromotionAgent.reset();
  WebinarEngagementAgent.reset();
  WebinarRecordingAgent.reset();
  WebinarMonetizationAgent.reset();
  WebinarAnalyticsAgent.reset();
  WebinarFollowUpAgent.reset();
  WebinarVideoHostingAgent.reset();
}
