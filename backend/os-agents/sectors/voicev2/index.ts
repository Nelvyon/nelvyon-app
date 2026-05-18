export type { VoiceV2Input, VoiceV2Output } from "./shared";
export {
  voiceV2LlmOpts as voiceV2LlmOpts,
  parseVoiceV2LlmJson,
  buildVoiceV2Prompt,
  runVoiceV2AgentCore,
  getDefaultVoiceV2Llm,
} from "./shared";
export * from "./VoiceV2MemoriaAgent";
export * from "./VoiceV2ContextoAgent";
export * from "./VoiceV2PerfilClienteAgent";
export * from "./VoiceV2PersonalizacionAgent";
export * from "./VoiceV2ResumenAgent";
export * from "./VoiceV2SeguimientoAgent";
export * from "./VoiceV2IntegracionAgent";
export * from "./VoiceV2AnalyticsAgent";

import { resetVoiceV2AnalyticsAgentForTests } from "./VoiceV2AnalyticsAgent";
import { resetVoiceV2ContextoAgentForTests } from "./VoiceV2ContextoAgent";
import { resetVoiceV2IntegracionAgentForTests } from "./VoiceV2IntegracionAgent";
import { resetVoiceV2MemoriaAgentForTests } from "./VoiceV2MemoriaAgent";
import { resetVoiceV2PerfilClienteAgentForTests } from "./VoiceV2PerfilClienteAgent";
import { resetVoiceV2PersonalizacionAgentForTests } from "./VoiceV2PersonalizacionAgent";
import { resetVoiceV2ResumenAgentForTests } from "./VoiceV2ResumenAgent";
import { resetVoiceV2SeguimientoAgentForTests } from "./VoiceV2SeguimientoAgent";

export function resetAllVoiceV2AgentsForTests(): void {
  resetVoiceV2MemoriaAgentForTests();
  resetVoiceV2ContextoAgentForTests();
  resetVoiceV2PerfilClienteAgentForTests();
  resetVoiceV2PersonalizacionAgentForTests();
  resetVoiceV2ResumenAgentForTests();
  resetVoiceV2SeguimientoAgentForTests();
  resetVoiceV2IntegracionAgentForTests();
  resetVoiceV2AnalyticsAgentForTests();
}
