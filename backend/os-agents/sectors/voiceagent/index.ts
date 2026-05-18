import { VoiceAgentAnalyticsAgent } from "./VoiceAgentAnalyticsAgent";
import { VoiceAgentCallerAgent } from "./VoiceAgentCallerAgent";
import { VoiceAgentComplianceAgent } from "./VoiceAgentComplianceAgent";
import { VoiceAgentFollowUpAgent } from "./VoiceAgentFollowUpAgent";
import { VoiceAgentQualifierAgent } from "./VoiceAgentQualifierAgent";
import { VoiceAgentScriptAgent } from "./VoiceAgentScriptAgent";
import { VoiceAgentSummaryAgent } from "./VoiceAgentSummaryAgent";
import { VoiceAgentTranscriberAgent } from "./VoiceAgentTranscriberAgent";

export type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
export { parseVoiceAgentLlmJson, buildVoiceAgentPrompt, llmOpts as voiceAgentLlmOpts } from "./shared";

export {
  VoiceAgentCallerAgent,
  getVoiceAgentCallerAgent,
  resetVoiceAgentCallerAgentForTests,
} from "./VoiceAgentCallerAgent";
export {
  VoiceAgentTranscriberAgent,
  getVoiceAgentTranscriberAgent,
  resetVoiceAgentTranscriberAgentForTests,
} from "./VoiceAgentTranscriberAgent";
export {
  VoiceAgentSummaryAgent,
  getVoiceAgentSummaryAgent,
  resetVoiceAgentSummaryAgentForTests,
} from "./VoiceAgentSummaryAgent";
export {
  VoiceAgentQualifierAgent,
  getVoiceAgentQualifierAgent,
  resetVoiceAgentQualifierAgentForTests,
} from "./VoiceAgentQualifierAgent";
export {
  VoiceAgentFollowUpAgent,
  getVoiceAgentFollowUpAgent,
  resetVoiceAgentFollowUpAgentForTests,
} from "./VoiceAgentFollowUpAgent";
export {
  VoiceAgentScriptAgent,
  getVoiceAgentScriptAgent,
  resetVoiceAgentScriptAgentForTests,
} from "./VoiceAgentScriptAgent";
export {
  VoiceAgentAnalyticsAgent,
  getVoiceAgentAnalyticsAgent,
  resetVoiceAgentAnalyticsAgentForTests,
} from "./VoiceAgentAnalyticsAgent";
export {
  VoiceAgentComplianceAgent,
  getVoiceAgentComplianceAgent,
  resetVoiceAgentComplianceAgentForTests,
} from "./VoiceAgentComplianceAgent";

export function resetAllVoiceAgentsForTests(): void {
  VoiceAgentCallerAgent.reset();
  VoiceAgentTranscriberAgent.reset();
  VoiceAgentSummaryAgent.reset();
  VoiceAgentQualifierAgent.reset();
  VoiceAgentFollowUpAgent.reset();
  VoiceAgentScriptAgent.reset();
  VoiceAgentAnalyticsAgent.reset();
  VoiceAgentComplianceAgent.reset();
}
