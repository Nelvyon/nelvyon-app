import { RealtimeAlertAgent } from "./RealtimeAlertAgent";
import { RealtimeAnalyticsAgent } from "./RealtimeAnalyticsAgent";
import { RealtimeDashboardAgent } from "./RealtimeDashboardAgent";
import { RealtimeEventAgent } from "./RealtimeEventAgent";
import { RealtimePersonalizationAgent } from "./RealtimePersonalizationAgent";
import { RealtimeSegmentAgent } from "./RealtimeSegmentAgent";
import { RealtimeStreamAgent } from "./RealtimeStreamAgent";
import { RealtimeTriggerAgent } from "./RealtimeTriggerAgent";

export type { RealtimeInput, RealtimeOutput } from "./shared";
export { parseRealtimeLlmJson, buildRealtimePrompt, llmOpts as realtimeLlmOpts } from "./shared";

export {
  RealtimeStreamAgent,
  getRealtimeStreamAgent,
  resetRealtimeStreamAgentForTests,
} from "./RealtimeStreamAgent";
export {
  RealtimeEventAgent,
  getRealtimeEventAgent,
  resetRealtimeEventAgentForTests,
} from "./RealtimeEventAgent";
export {
  RealtimeTriggerAgent,
  getRealtimeTriggerAgent,
  resetRealtimeTriggerAgentForTests,
} from "./RealtimeTriggerAgent";
export {
  RealtimeAlertAgent,
  getRealtimeAlertAgent,
  resetRealtimeAlertAgentForTests,
} from "./RealtimeAlertAgent";
export {
  RealtimeDashboardAgent,
  getRealtimeDashboardAgent,
  resetRealtimeDashboardAgentForTests,
} from "./RealtimeDashboardAgent";
export {
  RealtimeSegmentAgent,
  getRealtimeSegmentAgent,
  resetRealtimeSegmentAgentForTests,
} from "./RealtimeSegmentAgent";
export {
  RealtimePersonalizationAgent,
  getRealtimePersonalizationAgent,
  resetRealtimePersonalizationAgentForTests,
} from "./RealtimePersonalizationAgent";
export {
  RealtimeAnalyticsAgent,
  getRealtimeAnalyticsAgent,
  resetRealtimeAnalyticsAgentForTests,
} from "./RealtimeAnalyticsAgent";

export function resetAllRealtimeAgentsForTests(): void {
  RealtimeStreamAgent.reset();
  RealtimeEventAgent.reset();
  RealtimeTriggerAgent.reset();
  RealtimeAlertAgent.reset();
  RealtimeDashboardAgent.reset();
  RealtimeSegmentAgent.reset();
  RealtimePersonalizationAgent.reset();
  RealtimeAnalyticsAgent.reset();
}
