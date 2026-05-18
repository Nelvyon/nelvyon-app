import { PushAbandonmentNotifAgent } from "./PushAbandonmentNotifAgent";
import { PushEngagementNotifAgent } from "./PushEngagementNotifAgent";
import { PushMilestoneNotifAgent } from "./PushMilestoneNotifAgent";
import { PushOptimizationAgent } from "./PushOptimizationAgent";
import { PushPersonalizationAgent } from "./PushPersonalizationAgent";
import { PushPromotionalNotifAgent } from "./PushPromotionalNotifAgent";
import { PushTransactionalNotifAgent } from "./PushTransactionalNotifAgent";
import { PushWelcomeNotifAgent } from "./PushWelcomeNotifAgent";

export type { PushInput, PushOutput, PushPlatform } from "./shared";
export { parsePushLlmJson, buildNotifyPrompt, llmOpts as pushLlmOpts } from "./shared";

export {
  PushWelcomeNotifAgent,
  getPushWelcomeNotifAgent,
  resetPushWelcomeNotifAgentForTests,
} from "./PushWelcomeNotifAgent";
export {
  PushEngagementNotifAgent,
  getPushEngagementNotifAgent,
  resetPushEngagementNotifAgentForTests,
} from "./PushEngagementNotifAgent";
export {
  PushTransactionalNotifAgent,
  getPushTransactionalNotifAgent,
  resetPushTransactionalNotifAgentForTests,
} from "./PushTransactionalNotifAgent";
export {
  PushPromotionalNotifAgent,
  getPushPromotionalNotifAgent,
  resetPushPromotionalNotifAgentForTests,
} from "./PushPromotionalNotifAgent";
export {
  PushAbandonmentNotifAgent,
  getPushAbandonmentNotifAgent,
  resetPushAbandonmentNotifAgentForTests,
} from "./PushAbandonmentNotifAgent";
export {
  PushMilestoneNotifAgent,
  getPushMilestoneNotifAgent,
  resetPushMilestoneNotifAgentForTests,
} from "./PushMilestoneNotifAgent";
export {
  PushPersonalizationAgent,
  getPushPersonalizationAgent,
  resetPushPersonalizationAgentForTests,
} from "./PushPersonalizationAgent";
export {
  PushOptimizationAgent,
  getPushOptimizationAgent,
  resetPushOptimizationAgentForTests,
} from "./PushOptimizationAgent";

export function resetAllPushAgentsForTests(): void {
  PushWelcomeNotifAgent.reset();
  PushEngagementNotifAgent.reset();
  PushTransactionalNotifAgent.reset();
  PushPromotionalNotifAgent.reset();
  PushAbandonmentNotifAgent.reset();
  PushMilestoneNotifAgent.reset();
  PushPersonalizationAgent.reset();
  PushOptimizationAgent.reset();
}
