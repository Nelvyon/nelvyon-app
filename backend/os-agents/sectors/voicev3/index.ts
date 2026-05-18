export type { VoiceV3Input, VoiceV3Output } from "./shared";
export {
  voiceV3LlmOpts as voiceV3LlmOpts,
  parseVoiceV3LlmJson,
  buildVoiceV3Prompt,
  runVoiceV3AgentCore,
  getDefaultVoiceV3Llm,
} from "./shared";
export * from "./VoiceV3CierreAgent";
export * from "./VoiceV3ObjecionesAgent";
export * from "./VoiceV3PropuestaAgent";
export * from "./VoiceV3ContratoAgent";
export * from "./VoiceV3FirmaAgent";
export * from "./VoiceV3FollowUpAgent";
export * from "./VoiceV3UpsellAgent";
export * from "./VoiceV3AnalyticsAgent";

import { resetVoiceV3AnalyticsAgentForTests } from "./VoiceV3AnalyticsAgent";
import { resetVoiceV3CierreAgentForTests } from "./VoiceV3CierreAgent";
import { resetVoiceV3ContratoAgentForTests } from "./VoiceV3ContratoAgent";
import { resetVoiceV3FirmaAgentForTests } from "./VoiceV3FirmaAgent";
import { resetVoiceV3FollowUpAgentForTests } from "./VoiceV3FollowUpAgent";
import { resetVoiceV3ObjecionesAgentForTests } from "./VoiceV3ObjecionesAgent";
import { resetVoiceV3PropuestaAgentForTests } from "./VoiceV3PropuestaAgent";
import { resetVoiceV3UpsellAgentForTests } from "./VoiceV3UpsellAgent";

export function resetAllVoiceV3AgentsForTests(): void {
  resetVoiceV3CierreAgentForTests();
  resetVoiceV3ObjecionesAgentForTests();
  resetVoiceV3PropuestaAgentForTests();
  resetVoiceV3ContratoAgentForTests();
  resetVoiceV3FirmaAgentForTests();
  resetVoiceV3FollowUpAgentForTests();
  resetVoiceV3UpsellAgentForTests();
  resetVoiceV3AnalyticsAgentForTests();
}
