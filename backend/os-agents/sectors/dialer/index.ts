import { DialerAnalyticsAgent } from "./DialerAnalyticsAgent";
import { DialerAutoAgent } from "./DialerAutoAgent";
import { DialerCoachingAgent } from "./DialerCoachingAgent";
import { DialerFollowUpAgent } from "./DialerFollowUpAgent";
import { DialerRecordingAgent } from "./DialerRecordingAgent";
import { DialerScriptAgent } from "./DialerScriptAgent";
import { DialerTranscriptionAgent } from "./DialerTranscriptionAgent";
import { DialerVoicemailAgent } from "./DialerVoicemailAgent";

export type { DialerInput, DialerOutput } from "./shared";
export { parseDialerLlmJson, buildDialerPrompt, llmOpts as dialerLlmOpts } from "./shared";

export { DialerAutoAgent, getDialerAutoAgent, resetDialerAutoAgentForTests } from "./DialerAutoAgent";
export { DialerScriptAgent, getDialerScriptAgent, resetDialerScriptAgentForTests } from "./DialerScriptAgent";
export {
  DialerTranscriptionAgent,
  getDialerTranscriptionAgent,
  resetDialerTranscriptionAgentForTests,
} from "./DialerTranscriptionAgent";
export {
  DialerCoachingAgent,
  getDialerCoachingAgent,
  resetDialerCoachingAgentForTests,
} from "./DialerCoachingAgent";
export {
  DialerRecordingAgent,
  getDialerRecordingAgent,
  resetDialerRecordingAgentForTests,
} from "./DialerRecordingAgent";
export {
  DialerAnalyticsAgent,
  getDialerAnalyticsAgent,
  resetDialerAnalyticsAgentForTests,
} from "./DialerAnalyticsAgent";
export {
  DialerFollowUpAgent,
  getDialerFollowUpAgent,
  resetDialerFollowUpAgentForTests,
} from "./DialerFollowUpAgent";
export {
  DialerVoicemailAgent,
  getDialerVoicemailAgent,
  resetDialerVoicemailAgentForTests,
} from "./DialerVoicemailAgent";

export function resetAllDialerAgentsForTests(): void {
  DialerAutoAgent.reset();
  DialerScriptAgent.reset();
  DialerTranscriptionAgent.reset();
  DialerCoachingAgent.reset();
  DialerRecordingAgent.reset();
  DialerAnalyticsAgent.reset();
  DialerFollowUpAgent.reset();
  DialerVoicemailAgent.reset();
}
