export type { VoiceV5Input, VoiceV5Output } from "./shared";
export {
  voiceV5LlmOpts as voiceV5LlmOpts,
  parseVoiceV5LlmJson,
  buildVoiceV5Prompt,
  runVoiceV5AgentCore,
  getDefaultVoiceV5Llm,
} from "./shared";
export * from "./VoiceV5PersonalizacionAgent";
export * from "./VoiceV5ClonadoAgent";
export * from "./VoiceV5TonoAgent";
export * from "./VoiceV5ConsistenciaAgent";
export * from "./VoiceV5ABTestingAgent";
export * from "./VoiceV5LocalizacionAgent";
export * from "./VoiceV5AnalyticsAgent";

import { resetVoiceV5ABTestingAgentForTests } from "./VoiceV5ABTestingAgent";
import { resetVoiceV5AnalyticsAgentForTests } from "./VoiceV5AnalyticsAgent";
import { resetVoiceV5ClonadoAgentForTests } from "./VoiceV5ClonadoAgent";
import { resetVoiceV5ConsistenciaAgentForTests } from "./VoiceV5ConsistenciaAgent";
import { resetVoiceV5LocalizacionAgentForTests } from "./VoiceV5LocalizacionAgent";
import { resetVoiceV5PersonalizacionAgentForTests } from "./VoiceV5PersonalizacionAgent";
import { resetVoiceV5TonoAgentForTests } from "./VoiceV5TonoAgent";

export function resetAllVoiceV5AgentsForTests(): void {
  resetVoiceV5PersonalizacionAgentForTests();
  resetVoiceV5ClonadoAgentForTests();
  resetVoiceV5TonoAgentForTests();
  resetVoiceV5ConsistenciaAgentForTests();
  resetVoiceV5ABTestingAgentForTests();
  resetVoiceV5LocalizacionAgentForTests();
  resetVoiceV5AnalyticsAgentForTests();
}
