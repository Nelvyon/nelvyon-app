export type { VoiceV7Input, VoiceV7Output } from "./shared";
export {
  voiceV7LlmOpts as voiceV7LlmOpts,
  parseVoiceV7LlmJson,
  buildVoiceV7Prompt,
  runVoiceV7AgentCore,
  getDefaultVoiceV7Llm,
} from "./shared";
export * from "./VoiceV7GrabacionAgent";
export * from "./VoiceV7TranscripcionAgent";
export * from "./VoiceV7AlmacenamientoAgent";
export * from "./VoiceV7RetencionAgent";
export * from "./VoiceV7RedaccionAgent";
export * from "./VoiceV7AuditoriaAgent";
export * from "./VoiceV7ExportacionAgent";
export * from "./VoiceV7ConsentimientoAgent";

import { resetVoiceV7AlmacenamientoAgentForTests } from "./VoiceV7AlmacenamientoAgent";
import { resetVoiceV7AuditoriaAgentForTests } from "./VoiceV7AuditoriaAgent";
import { resetVoiceV7ConsentimientoAgentForTests } from "./VoiceV7ConsentimientoAgent";
import { resetVoiceV7ExportacionAgentForTests } from "./VoiceV7ExportacionAgent";
import { resetVoiceV7GrabacionAgentForTests } from "./VoiceV7GrabacionAgent";
import { resetVoiceV7RedaccionAgentForTests } from "./VoiceV7RedaccionAgent";
import { resetVoiceV7RetencionAgentForTests } from "./VoiceV7RetencionAgent";
import { resetVoiceV7TranscripcionAgentForTests } from "./VoiceV7TranscripcionAgent";

export function resetAllVoiceV7AgentsForTests(): void {
  resetVoiceV7GrabacionAgentForTests();
  resetVoiceV7TranscripcionAgentForTests();
  resetVoiceV7AlmacenamientoAgentForTests();
  resetVoiceV7RetencionAgentForTests();
  resetVoiceV7RedaccionAgentForTests();
  resetVoiceV7AuditoriaAgentForTests();
  resetVoiceV7ExportacionAgentForTests();
  resetVoiceV7ConsentimientoAgentForTests();
}
