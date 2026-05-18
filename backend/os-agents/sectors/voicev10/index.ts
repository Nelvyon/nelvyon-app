export type { VoiceV10Input, VoiceV10Output } from "./shared";
export {
  voiceV10LlmOpts as voiceV10LlmOpts,
  parseVoiceV10LlmJson,
  buildVoiceV10Prompt,
  runVoiceV10AgentCore,
  getDefaultVoiceV10Llm,
} from "./shared";
export * from "./VoiceV10DeteccionAgent";
export * from "./VoiceV10AjusteTonalAgent";
export * from "./VoiceV10EscalacionAgent";
export * from "./VoiceV10RegistroAgent";
export * from "./VoiceV10AlertasAgent";
export * from "./VoiceV10SentimientoAgent";
export * from "./VoiceV10CorrelacionAgent";

import { resetVoiceV10AjusteTonalAgentForTests } from "./VoiceV10AjusteTonalAgent";
import { resetVoiceV10AlertasAgentForTests } from "./VoiceV10AlertasAgent";
import { resetVoiceV10CorrelacionAgentForTests } from "./VoiceV10CorrelacionAgent";
import { resetVoiceV10DeteccionAgentForTests } from "./VoiceV10DeteccionAgent";
import { resetVoiceV10EscalacionAgentForTests } from "./VoiceV10EscalacionAgent";
import { resetVoiceV10RegistroAgentForTests } from "./VoiceV10RegistroAgent";
import { resetVoiceV10SentimientoAgentForTests } from "./VoiceV10SentimientoAgent";

export function resetAllVoiceV10AgentsForTests(): void {
  resetVoiceV10DeteccionAgentForTests();
  resetVoiceV10AjusteTonalAgentForTests();
  resetVoiceV10EscalacionAgentForTests();
  resetVoiceV10RegistroAgentForTests();
  resetVoiceV10AlertasAgentForTests();
  resetVoiceV10SentimientoAgentForTests();
  resetVoiceV10CorrelacionAgentForTests();
}
