export type { VoiceV8Input, VoiceV8Output } from "./shared";
export {
  voiceV8LlmOpts as voiceV8LlmOpts,
  parseVoiceV8LlmJson,
  buildVoiceV8Prompt,
  runVoiceV8AgentCore,
  getDefaultVoiceV8Llm,
} from "./shared";
export * from "./VoiceV8AnalisisAgent";
export * from "./VoiceV8ScoringAgent";
export * from "./VoiceV8ObjecionesAgent";
export * from "./VoiceV8CoachingAgent";
export * from "./VoiceV8BenchmarkAgent";
export * from "./VoiceV8ReportesAgent";
export * from "./VoiceV8AlertasAgent";
export * from "./VoiceV8HeatmapAgent";

import { resetVoiceV8AlertasAgentForTests } from "./VoiceV8AlertasAgent";
import { resetVoiceV8AnalisisAgentForTests } from "./VoiceV8AnalisisAgent";
import { resetVoiceV8BenchmarkAgentForTests } from "./VoiceV8BenchmarkAgent";
import { resetVoiceV8CoachingAgentForTests } from "./VoiceV8CoachingAgent";
import { resetVoiceV8HeatmapAgentForTests } from "./VoiceV8HeatmapAgent";
import { resetVoiceV8ObjecionesAgentForTests } from "./VoiceV8ObjecionesAgent";
import { resetVoiceV8ReportesAgentForTests } from "./VoiceV8ReportesAgent";
import { resetVoiceV8ScoringAgentForTests } from "./VoiceV8ScoringAgent";

export function resetAllVoiceV8AgentsForTests(): void {
  resetVoiceV8AnalisisAgentForTests();
  resetVoiceV8ScoringAgentForTests();
  resetVoiceV8ObjecionesAgentForTests();
  resetVoiceV8CoachingAgentForTests();
  resetVoiceV8BenchmarkAgentForTests();
  resetVoiceV8ReportesAgentForTests();
  resetVoiceV8AlertasAgentForTests();
  resetVoiceV8HeatmapAgentForTests();
}
