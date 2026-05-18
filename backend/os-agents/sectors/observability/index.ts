import { ObservabilityAlertAgent } from "./ObservabilityAlertAgent";
import { ObservabilityAuditAgent } from "./ObservabilityAuditAgent";
import { ObservabilityDashboardAgent } from "./ObservabilityDashboardAgent";
import { ObservabilityLoggerAgent } from "./ObservabilityLoggerAgent";
import { ObservabilityMetricsAgent } from "./ObservabilityMetricsAgent";
import { ObservabilityReportAgent } from "./ObservabilityReportAgent";
import { ObservabilityRetentionAgent } from "./ObservabilityRetentionAgent";
import { ObservabilityTracerAgent } from "./ObservabilityTracerAgent";

export type { ObservabilityInput, ObservabilityOutput } from "./shared";
export { parseObservabilityLlmJson, buildObservabilityPrompt, llmOpts as observabilityLlmOpts } from "./shared";

export {
  ObservabilityTracerAgent,
  getObservabilityTracerAgent,
  resetObservabilityTracerAgentForTests,
} from "./ObservabilityTracerAgent";
export {
  ObservabilityLoggerAgent,
  getObservabilityLoggerAgent,
  resetObservabilityLoggerAgentForTests,
} from "./ObservabilityLoggerAgent";
export {
  ObservabilityMetricsAgent,
  getObservabilityMetricsAgent,
  resetObservabilityMetricsAgentForTests,
} from "./ObservabilityMetricsAgent";
export {
  ObservabilityAlertAgent,
  getObservabilityAlertAgent,
  resetObservabilityAlertAgentForTests,
} from "./ObservabilityAlertAgent";
export {
  ObservabilityDashboardAgent,
  getObservabilityDashboardAgent,
  resetObservabilityDashboardAgentForTests,
} from "./ObservabilityDashboardAgent";
export {
  ObservabilityAuditAgent,
  getObservabilityAuditAgent,
  resetObservabilityAuditAgentForTests,
} from "./ObservabilityAuditAgent";
export {
  ObservabilityRetentionAgent,
  getObservabilityRetentionAgent,
  resetObservabilityRetentionAgentForTests,
} from "./ObservabilityRetentionAgent";
export {
  ObservabilityReportAgent,
  getObservabilityReportAgent,
  resetObservabilityReportAgentForTests,
} from "./ObservabilityReportAgent";

export function resetAllObservabilityAgentsForTests(): void {
  ObservabilityTracerAgent.reset();
  ObservabilityLoggerAgent.reset();
  ObservabilityMetricsAgent.reset();
  ObservabilityAlertAgent.reset();
  ObservabilityDashboardAgent.reset();
  ObservabilityAuditAgent.reset();
  ObservabilityRetentionAgent.reset();
  ObservabilityReportAgent.reset();
}
