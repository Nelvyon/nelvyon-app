export type { VoiceV9Input, VoiceV9Output } from "./shared";
export {
  voiceV9LlmOpts as voiceV9LlmOpts,
  parseVoiceV9LlmJson,
  buildVoiceV9Prompt,
  runVoiceV9AgentCore,
  getDefaultVoiceV9Llm,
} from "./shared";
export * from "./VoiceV9WhatsAppAgent";
export * from "./VoiceV9SmsAgent";
export * from "./VoiceV9VideoAgent";
export * from "./VoiceV9ContinuidadAgent";
export * from "./VoiceV9DocumentosAgent";
export * from "./VoiceV9NotificacionesAgent";
export * from "./VoiceV9OptinAgent";
export * from "./VoiceV9MetricasAgent";

import { resetVoiceV9ContinuidadAgentForTests } from "./VoiceV9ContinuidadAgent";
import { resetVoiceV9DocumentosAgentForTests } from "./VoiceV9DocumentosAgent";
import { resetVoiceV9MetricasAgentForTests } from "./VoiceV9MetricasAgent";
import { resetVoiceV9NotificacionesAgentForTests } from "./VoiceV9NotificacionesAgent";
import { resetVoiceV9OptinAgentForTests } from "./VoiceV9OptinAgent";
import { resetVoiceV9SmsAgentForTests } from "./VoiceV9SmsAgent";
import { resetVoiceV9VideoAgentForTests } from "./VoiceV9VideoAgent";
import { resetVoiceV9WhatsAppAgentForTests } from "./VoiceV9WhatsAppAgent";

export function resetAllVoiceV9AgentsForTests(): void {
  resetVoiceV9WhatsAppAgentForTests();
  resetVoiceV9SmsAgentForTests();
  resetVoiceV9VideoAgentForTests();
  resetVoiceV9ContinuidadAgentForTests();
  resetVoiceV9DocumentosAgentForTests();
  resetVoiceV9NotificacionesAgentForTests();
  resetVoiceV9OptinAgentForTests();
  resetVoiceV9MetricasAgentForTests();
}
