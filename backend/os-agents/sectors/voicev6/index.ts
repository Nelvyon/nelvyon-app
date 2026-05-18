export type { VoiceV6Input, VoiceV6Output } from "./shared";
export {
  voiceV6LlmOpts as voiceV6LlmOpts,
  parseVoiceV6LlmJson,
  buildVoiceV6Prompt,
  runVoiceV6AgentCore,
  getDefaultVoiceV6Llm,
} from "./shared";
export * from "./VoiceV6OrquestadorAgent";
export * from "./VoiceV6BalanceoAgent";
export * from "./VoiceV6ColasAgent";
export * from "./VoiceV6FailoverAgent";
export * from "./VoiceV6RateLimitAgent";
export * from "./VoiceV6MonitoreoAgent";
export * from "./VoiceV6ScalingAgent";
export * from "./VoiceV6CostesAgent";

import { resetVoiceV6BalanceoAgentForTests } from "./VoiceV6BalanceoAgent";
import { resetVoiceV6ColasAgentForTests } from "./VoiceV6ColasAgent";
import { resetVoiceV6CostesAgentForTests } from "./VoiceV6CostesAgent";
import { resetVoiceV6FailoverAgentForTests } from "./VoiceV6FailoverAgent";
import { resetVoiceV6MonitoreoAgentForTests } from "./VoiceV6MonitoreoAgent";
import { resetVoiceV6OrquestadorAgentForTests } from "./VoiceV6OrquestadorAgent";
import { resetVoiceV6RateLimitAgentForTests } from "./VoiceV6RateLimitAgent";
import { resetVoiceV6ScalingAgentForTests } from "./VoiceV6ScalingAgent";

export function resetAllVoiceV6AgentsForTests(): void {
  resetVoiceV6OrquestadorAgentForTests();
  resetVoiceV6BalanceoAgentForTests();
  resetVoiceV6ColasAgentForTests();
  resetVoiceV6FailoverAgentForTests();
  resetVoiceV6RateLimitAgentForTests();
  resetVoiceV6MonitoreoAgentForTests();
  resetVoiceV6ScalingAgentForTests();
  resetVoiceV6CostesAgentForTests();
}
