import { TimezoneAuditAgent } from "./TimezoneAuditAgent";
import { TimezoneCalendarAgent } from "./TimezoneCalendarAgent";
import { TimezoneConverterAgent } from "./TimezoneConverterAgent";
import { TimezoneDetectorAgent } from "./TimezoneDetectorAgent";
import { TimezoneNotifierAgent } from "./TimezoneNotifierAgent";
import { TimezoneOptimalAgent } from "./TimezoneOptimalAgent";
import { TimezoneReportAgent } from "./TimezoneReportAgent";
import { TimezoneSchedulerAgent } from "./TimezoneSchedulerAgent";

export type { TimezoneId, TimezoneInput, TimezoneOutput } from "./shared";
export { parseTimezoneLlmJson, buildTimezonePrompt, llmOpts as timezoneLlmOpts } from "./shared";

export {
  TimezoneDetectorAgent,
  getTimezoneDetectorAgent,
  resetTimezoneDetectorAgentForTests,
} from "./TimezoneDetectorAgent";
export {
  TimezoneSchedulerAgent,
  getTimezoneSchedulerAgent,
  resetTimezoneSchedulerAgentForTests,
} from "./TimezoneSchedulerAgent";
export {
  TimezoneConverterAgent,
  getTimezoneConverterAgent,
  resetTimezoneConverterAgentForTests,
} from "./TimezoneConverterAgent";
export {
  TimezoneOptimalAgent,
  getTimezoneOptimalAgent,
  resetTimezoneOptimalAgentForTests,
} from "./TimezoneOptimalAgent";
export {
  TimezoneNotifierAgent,
  getTimezoneNotifierAgent,
  resetTimezoneNotifierAgentForTests,
} from "./TimezoneNotifierAgent";
export {
  TimezoneReportAgent,
  getTimezoneReportAgent,
  resetTimezoneReportAgentForTests,
} from "./TimezoneReportAgent";
export {
  TimezoneCalendarAgent,
  getTimezoneCalendarAgent,
  resetTimezoneCalendarAgentForTests,
} from "./TimezoneCalendarAgent";
export {
  TimezoneAuditAgent,
  getTimezoneAuditAgent,
  resetTimezoneAuditAgentForTests,
} from "./TimezoneAuditAgent";

export function resetAllTimezoneAgentsForTests(): void {
  TimezoneDetectorAgent.reset();
  TimezoneSchedulerAgent.reset();
  TimezoneConverterAgent.reset();
  TimezoneOptimalAgent.reset();
  TimezoneNotifierAgent.reset();
  TimezoneReportAgent.reset();
  TimezoneCalendarAgent.reset();
  TimezoneAuditAgent.reset();
}
