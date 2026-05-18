export type { VoiceV4Input, VoiceV4Output } from "./shared";
export {
  voiceV4LlmOpts as voiceV4LlmOpts,
  parseVoiceV4LlmJson,
  buildVoiceV4Prompt,
  runVoiceV4AgentCore,
  getDefaultVoiceV4Llm,
} from "./shared";
export * from "./VoiceV4TransferenciaAgent";
export * from "./VoiceV4HandoffAgent";
export * from "./VoiceV4ContinuidadAgent";
export * from "./VoiceV4WhatsAppAgent";
export * from "./VoiceV4EmailAgent";
export * from "./VoiceV4ChatAgent";
export * from "./VoiceV4EscalacionAgent";
export * from "./VoiceV4AnalyticsAgent";

import { resetVoiceV4AnalyticsAgentForTests } from "./VoiceV4AnalyticsAgent";
import { resetVoiceV4ChatAgentForTests } from "./VoiceV4ChatAgent";
import { resetVoiceV4ContinuidadAgentForTests } from "./VoiceV4ContinuidadAgent";
import { resetVoiceV4EmailAgentForTests } from "./VoiceV4EmailAgent";
import { resetVoiceV4EscalacionAgentForTests } from "./VoiceV4EscalacionAgent";
import { resetVoiceV4HandoffAgentForTests } from "./VoiceV4HandoffAgent";
import { resetVoiceV4TransferenciaAgentForTests } from "./VoiceV4TransferenciaAgent";
import { resetVoiceV4WhatsAppAgentForTests } from "./VoiceV4WhatsAppAgent";

export function resetAllVoiceV4AgentsForTests(): void {
  resetVoiceV4TransferenciaAgentForTests();
  resetVoiceV4HandoffAgentForTests();
  resetVoiceV4ContinuidadAgentForTests();
  resetVoiceV4WhatsAppAgentForTests();
  resetVoiceV4EmailAgentForTests();
  resetVoiceV4ChatAgentForTests();
  resetVoiceV4EscalacionAgentForTests();
  resetVoiceV4AnalyticsAgentForTests();
}
