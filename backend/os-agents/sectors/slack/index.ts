import { SlackAlertAgent } from "./SlackAlertAgent";
import { SlackAnalyticsAgent } from "./SlackAnalyticsAgent";
import { SlackAuthAgent } from "./SlackAuthAgent";
import { SlackCommandAgent } from "./SlackCommandAgent";
import { SlackDigestAgent } from "./SlackDigestAgent";
import { SlackNotifierAgent } from "./SlackNotifierAgent";
import { SlackReportAgent } from "./SlackReportAgent";
import { SlackSyncAgent } from "./SlackSyncAgent";

export type { SlackInput, SlackOutput } from "./shared";
export { parseSlackLlmJson, buildSlackPrompt, llmOpts as slackLlmOpts } from "./shared";

export {
  SlackAuthAgent,
  getSlackAuthAgent,
  resetSlackAuthAgentForTests,
} from "./SlackAuthAgent";
export {
  SlackNotifierAgent,
  getSlackNotifierAgent,
  resetSlackNotifierAgentForTests,
} from "./SlackNotifierAgent";
export {
  SlackReportAgent,
  getSlackReportAgent,
  resetSlackReportAgentForTests,
} from "./SlackReportAgent";
export {
  SlackAlertAgent,
  getSlackAlertAgent,
  resetSlackAlertAgentForTests,
} from "./SlackAlertAgent";
export {
  SlackCommandAgent,
  getSlackCommandAgent,
  resetSlackCommandAgentForTests,
} from "./SlackCommandAgent";
export {
  SlackDigestAgent,
  getSlackDigestAgent,
  resetSlackDigestAgentForTests,
} from "./SlackDigestAgent";
export {
  SlackSyncAgent,
  getSlackSyncAgent,
  resetSlackSyncAgentForTests,
} from "./SlackSyncAgent";
export {
  SlackAnalyticsAgent,
  getSlackAnalyticsAgent,
  resetSlackAnalyticsAgentForTests,
} from "./SlackAnalyticsAgent";

export function resetAllSlackAgentsForTests(): void {
  SlackAuthAgent.reset();
  SlackNotifierAgent.reset();
  SlackReportAgent.reset();
  SlackAlertAgent.reset();
  SlackCommandAgent.reset();
  SlackDigestAgent.reset();
  SlackSyncAgent.reset();
  SlackAnalyticsAgent.reset();
}
