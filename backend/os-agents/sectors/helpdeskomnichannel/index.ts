import { HelpDeskOmnichannelAnalyticsAgent } from "./HelpDeskOmnichannelAnalyticsAgent";
import { HelpDeskOmnichannelChatAgent } from "./HelpDeskOmnichannelChatAgent";
import { HelpDeskOmnichannelEmailAgent } from "./HelpDeskOmnichannelEmailAgent";
import { HelpDeskOmnichannelEscalationAgent } from "./HelpDeskOmnichannelEscalationAgent";
import { HelpDeskOmnichannelKnowledgeAgent } from "./HelpDeskOmnichannelKnowledgeAgent";
import { HelpDeskOmnichannelTicketAgent } from "./HelpDeskOmnichannelTicketAgent";
import { HelpDeskOmnichannelVoiceAgent } from "./HelpDeskOmnichannelVoiceAgent";
import { HelpDeskOmnichannelWhatsAppAgent } from "./HelpDeskOmnichannelWhatsAppAgent";

export type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
export {
  parseHelpDeskOmnichannelLlmJson,
  buildHelpDeskOmnichannelPrompt,
  llmOpts as helpdeskomnichannelLlmOpts,
} from "./shared";

export {
  HelpDeskOmnichannelTicketAgent,
  getHelpDeskOmnichannelTicketAgent,
  resetHelpDeskOmnichannelTicketAgentForTests,
} from "./HelpDeskOmnichannelTicketAgent";
export {
  HelpDeskOmnichannelEmailAgent,
  getHelpDeskOmnichannelEmailAgent,
  resetHelpDeskOmnichannelEmailAgentForTests,
} from "./HelpDeskOmnichannelEmailAgent";
export {
  HelpDeskOmnichannelChatAgent,
  getHelpDeskOmnichannelChatAgent,
  resetHelpDeskOmnichannelChatAgentForTests,
} from "./HelpDeskOmnichannelChatAgent";
export {
  HelpDeskOmnichannelWhatsAppAgent,
  getHelpDeskOmnichannelWhatsAppAgent,
  resetHelpDeskOmnichannelWhatsAppAgentForTests,
} from "./HelpDeskOmnichannelWhatsAppAgent";
export {
  HelpDeskOmnichannelVoiceAgent,
  getHelpDeskOmnichannelVoiceAgent,
  resetHelpDeskOmnichannelVoiceAgentForTests,
} from "./HelpDeskOmnichannelVoiceAgent";
export {
  HelpDeskOmnichannelAnalyticsAgent,
  getHelpDeskOmnichannelAnalyticsAgent,
  resetHelpDeskOmnichannelAnalyticsAgentForTests,
} from "./HelpDeskOmnichannelAnalyticsAgent";
export {
  HelpDeskOmnichannelEscalationAgent,
  getHelpDeskOmnichannelEscalationAgent,
  resetHelpDeskOmnichannelEscalationAgentForTests,
} from "./HelpDeskOmnichannelEscalationAgent";
export {
  HelpDeskOmnichannelKnowledgeAgent,
  getHelpDeskOmnichannelKnowledgeAgent,
  resetHelpDeskOmnichannelKnowledgeAgentForTests,
} from "./HelpDeskOmnichannelKnowledgeAgent";

export function resetAllHelpDeskOmnichannelAgentsForTests(): void {
  HelpDeskOmnichannelTicketAgent.reset();
  HelpDeskOmnichannelEmailAgent.reset();
  HelpDeskOmnichannelChatAgent.reset();
  HelpDeskOmnichannelWhatsAppAgent.reset();
  HelpDeskOmnichannelVoiceAgent.reset();
  HelpDeskOmnichannelAnalyticsAgent.reset();
  HelpDeskOmnichannelEscalationAgent.reset();
  HelpDeskOmnichannelKnowledgeAgent.reset();
}
