import { GCalZoomAnalyticsAgent } from "./GCalZoomAnalyticsAgent";
import { GCalZoomAuthAgent } from "./GCalZoomAuthAgent";
import { GCalZoomFollowUpAgent } from "./GCalZoomFollowUpAgent";
import { GCalZoomRecorderAgent } from "./GCalZoomRecorderAgent";
import { GCalZoomReminderAgent } from "./GCalZoomReminderAgent";
import { GCalZoomSchedulerAgent } from "./GCalZoomSchedulerAgent";
import { GCalZoomSyncAgent } from "./GCalZoomSyncAgent";
import { GCalZoomTemplateAgent } from "./GCalZoomTemplateAgent";

export type { GCalZoomInput, GCalZoomMeetingType, GCalZoomOutput } from "./shared";
export { parseGCalZoomLlmJson, buildGCalZoomPrompt, llmOpts as gcalZoomLlmOpts } from "./shared";

export {
  GCalZoomAuthAgent,
  getGCalZoomAuthAgent,
  resetGCalZoomAuthAgentForTests,
} from "./GCalZoomAuthAgent";
export {
  GCalZoomSchedulerAgent,
  getGCalZoomSchedulerAgent,
  resetGCalZoomSchedulerAgentForTests,
} from "./GCalZoomSchedulerAgent";
export {
  GCalZoomReminderAgent,
  getGCalZoomReminderAgent,
  resetGCalZoomReminderAgentForTests,
} from "./GCalZoomReminderAgent";
export {
  GCalZoomRecorderAgent,
  getGCalZoomRecorderAgent,
  resetGCalZoomRecorderAgentForTests,
} from "./GCalZoomRecorderAgent";
export {
  GCalZoomSyncAgent,
  getGCalZoomSyncAgent,
  resetGCalZoomSyncAgentForTests,
} from "./GCalZoomSyncAgent";
export {
  GCalZoomFollowUpAgent,
  getGCalZoomFollowUpAgent,
  resetGCalZoomFollowUpAgentForTests,
} from "./GCalZoomFollowUpAgent";
export {
  GCalZoomAnalyticsAgent,
  getGCalZoomAnalyticsAgent,
  resetGCalZoomAnalyticsAgentForTests,
} from "./GCalZoomAnalyticsAgent";
export {
  GCalZoomTemplateAgent,
  getGCalZoomTemplateAgent,
  resetGCalZoomTemplateAgentForTests,
} from "./GCalZoomTemplateAgent";

export function resetAllGCalZoomAgentsForTests(): void {
  GCalZoomAuthAgent.reset();
  GCalZoomSchedulerAgent.reset();
  GCalZoomReminderAgent.reset();
  GCalZoomRecorderAgent.reset();
  GCalZoomSyncAgent.reset();
  GCalZoomFollowUpAgent.reset();
  GCalZoomAnalyticsAgent.reset();
  GCalZoomTemplateAgent.reset();
}
