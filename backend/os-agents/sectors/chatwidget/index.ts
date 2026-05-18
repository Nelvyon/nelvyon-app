import { ChatWidgetAnalyticsAgent } from "./ChatWidgetAnalyticsAgent";
import { ChatWidgetConversationAgent } from "./ChatWidgetConversationAgent";
import { ChatWidgetIntegrationAgent } from "./ChatWidgetIntegrationAgent";
import { ChatWidgetLeadCaptureAgent } from "./ChatWidgetLeadCaptureAgent";
import { ChatWidgetPersonalizationAgent } from "./ChatWidgetPersonalizationAgent";
import { ChatWidgetProactiveAgent } from "./ChatWidgetProactiveAgent";
import { ChatWidgetSupportAgent } from "./ChatWidgetSupportAgent";
import { ChatWidgetTrainingAgent } from "./ChatWidgetTrainingAgent";

export type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
export { parseChatWidgetLlmJson, buildChatWidgetPrompt, llmOpts as chatwidgetLlmOpts } from "./shared";

export {
  ChatWidgetConversationAgent,
  getChatWidgetConversationAgent,
  resetChatWidgetConversationAgentForTests,
} from "./ChatWidgetConversationAgent";
export {
  ChatWidgetLeadCaptureAgent,
  getChatWidgetLeadCaptureAgent,
  resetChatWidgetLeadCaptureAgentForTests,
} from "./ChatWidgetLeadCaptureAgent";
export {
  ChatWidgetSupportAgent,
  getChatWidgetSupportAgent,
  resetChatWidgetSupportAgentForTests,
} from "./ChatWidgetSupportAgent";
export {
  ChatWidgetPersonalizationAgent,
  getChatWidgetPersonalizationAgent,
  resetChatWidgetPersonalizationAgentForTests,
} from "./ChatWidgetPersonalizationAgent";
export {
  ChatWidgetProactiveAgent,
  getChatWidgetProactiveAgent,
  resetChatWidgetProactiveAgentForTests,
} from "./ChatWidgetProactiveAgent";
export {
  ChatWidgetAnalyticsAgent,
  getChatWidgetAnalyticsAgent,
  resetChatWidgetAnalyticsAgentForTests,
} from "./ChatWidgetAnalyticsAgent";
export {
  ChatWidgetIntegrationAgent,
  getChatWidgetIntegrationAgent,
  resetChatWidgetIntegrationAgentForTests,
} from "./ChatWidgetIntegrationAgent";
export {
  ChatWidgetTrainingAgent,
  getChatWidgetTrainingAgent,
  resetChatWidgetTrainingAgentForTests,
} from "./ChatWidgetTrainingAgent";

export function resetAllChatWidgetAgentsForTests(): void {
  ChatWidgetConversationAgent.reset();
  ChatWidgetLeadCaptureAgent.reset();
  ChatWidgetSupportAgent.reset();
  ChatWidgetPersonalizationAgent.reset();
  ChatWidgetProactiveAgent.reset();
  ChatWidgetAnalyticsAgent.reset();
  ChatWidgetIntegrationAgent.reset();
  ChatWidgetTrainingAgent.reset();
}
