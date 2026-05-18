import { SuperiorReportingAnomalyAgent } from "./SuperiorReportingAnomalyAgent";
import { SuperiorReportingAttributionAgent } from "./SuperiorReportingAttributionAgent";
import { SuperiorReportingBenchmarkAgent } from "./SuperiorReportingBenchmarkAgent";
import { SuperiorReportingDashboardAgent } from "./SuperiorReportingDashboardAgent";
import { SuperiorReportingExportAgent } from "./SuperiorReportingExportAgent";
import { SuperiorReportingForecastAgent } from "./SuperiorReportingForecastAgent";
import { SuperiorReportingNarrativeAgent } from "./SuperiorReportingNarrativeAgent";
import { SuperiorReportingSchedulerAgent } from "./SuperiorReportingSchedulerAgent";

export type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
export {
  parseSuperiorReportingLlmJson,
  buildSuperiorReportingPrompt,
  llmOpts as superiorreportingLlmOpts,
} from "./shared";

export {
  SuperiorReportingDashboardAgent,
  getSuperiorReportingDashboardAgent,
  resetSuperiorReportingDashboardAgentForTests,
} from "./SuperiorReportingDashboardAgent";
export {
  SuperiorReportingSchedulerAgent,
  getSuperiorReportingSchedulerAgent,
  resetSuperiorReportingSchedulerAgentForTests,
} from "./SuperiorReportingSchedulerAgent";
export {
  SuperiorReportingNarrativeAgent,
  getSuperiorReportingNarrativeAgent,
  resetSuperiorReportingNarrativeAgentForTests,
} from "./SuperiorReportingNarrativeAgent";
export {
  SuperiorReportingAnomalyAgent,
  getSuperiorReportingAnomalyAgent,
  resetSuperiorReportingAnomalyAgentForTests,
} from "./SuperiorReportingAnomalyAgent";
export {
  SuperiorReportingAttributionAgent,
  getSuperiorReportingAttributionAgent,
  resetSuperiorReportingAttributionAgentForTests,
} from "./SuperiorReportingAttributionAgent";
export {
  SuperiorReportingForecastAgent,
  getSuperiorReportingForecastAgent,
  resetSuperiorReportingForecastAgentForTests,
} from "./SuperiorReportingForecastAgent";
export {
  SuperiorReportingExportAgent,
  getSuperiorReportingExportAgent,
  resetSuperiorReportingExportAgentForTests,
} from "./SuperiorReportingExportAgent";
export {
  SuperiorReportingBenchmarkAgent,
  getSuperiorReportingBenchmarkAgent,
  resetSuperiorReportingBenchmarkAgentForTests,
} from "./SuperiorReportingBenchmarkAgent";

export function resetAllSuperiorReportingAgentsForTests(): void {
  SuperiorReportingDashboardAgent.reset();
  SuperiorReportingSchedulerAgent.reset();
  SuperiorReportingNarrativeAgent.reset();
  SuperiorReportingAnomalyAgent.reset();
  SuperiorReportingAttributionAgent.reset();
  SuperiorReportingForecastAgent.reset();
  SuperiorReportingExportAgent.reset();
  SuperiorReportingBenchmarkAgent.reset();
}
