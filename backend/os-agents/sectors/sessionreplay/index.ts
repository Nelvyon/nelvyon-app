import { ABReplayAgent } from "./ABReplayAgent";
import { FunnelReplayAgent } from "./FunnelReplayAgent";
import { HeatmapAgent } from "./HeatmapAgent";
import { InsightAgent } from "./InsightAgent";
import { PrivacyMaskingAgent } from "./PrivacyMaskingAgent";
import { RageClickAgent } from "./RageClickAgent";
import { SegmentReplayAgent } from "./SegmentReplayAgent";
import { SessionRecordingAgent } from "./SessionRecordingAgent";

export type { SessionReplayInput, SessionReplayOutput } from "./shared";
export { parseSessionReplayLlmJson, buildSessionReplayPrompt, llmOpts as sessionreplayLlmOpts } from "./shared";

export {
  SessionRecordingAgent,
  getSessionRecordingAgent,
  resetSessionRecordingAgentForTests,
} from "./SessionRecordingAgent";
export { HeatmapAgent, getHeatmapAgent, resetHeatmapAgentForTests } from "./HeatmapAgent";
export { RageClickAgent, getRageClickAgent, resetRageClickAgentForTests } from "./RageClickAgent";
export {
  FunnelReplayAgent,
  getFunnelReplayAgent,
  resetFunnelReplayAgentForTests,
} from "./FunnelReplayAgent";
export {
  SegmentReplayAgent,
  getSegmentReplayAgent,
  resetSegmentReplayAgentForTests,
} from "./SegmentReplayAgent";
export { InsightAgent, getInsightAgent, resetInsightAgentForTests } from "./InsightAgent";
export { ABReplayAgent, getABReplayAgent, resetABReplayAgentForTests } from "./ABReplayAgent";
export {
  PrivacyMaskingAgent,
  getPrivacyMaskingAgent,
  resetPrivacyMaskingAgentForTests,
} from "./PrivacyMaskingAgent";

export function resetAllSessionReplayAgentsForTests(): void {
  SessionRecordingAgent.reset();
  HeatmapAgent.reset();
  RageClickAgent.reset();
  FunnelReplayAgent.reset();
  SegmentReplayAgent.reset();
  InsightAgent.reset();
  ABReplayAgent.reset();
  PrivacyMaskingAgent.reset();
}
