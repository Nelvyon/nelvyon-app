import { SuperiorPerformanceAuditAgent } from "./SuperiorPerformanceAuditAgent";
import { SuperiorPerformanceBundleAgent } from "./SuperiorPerformanceBundleAgent";
import { SuperiorPerformanceCacheAgent } from "./SuperiorPerformanceCacheAgent";
import { SuperiorPerformanceCDNAgent } from "./SuperiorPerformanceCDNAgent";
import { SuperiorPerformanceDatabaseAgent } from "./SuperiorPerformanceDatabaseAgent";
import { SuperiorPerformanceImageAgent } from "./SuperiorPerformanceImageAgent";
import { SuperiorPerformanceMonitorAgent } from "./SuperiorPerformanceMonitorAgent";
import { SuperiorPerformanceReportAgent } from "./SuperiorPerformanceReportAgent";

export type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
export {
  parseSuperiorPerformanceLlmJson,
  buildSuperiorPerformancePrompt,
  llmOpts as superiorperformanceLlmOpts,
} from "./shared";

export {
  SuperiorPerformanceAuditAgent,
  getSuperiorPerformanceAuditAgent,
  resetSuperiorPerformanceAuditAgentForTests,
} from "./SuperiorPerformanceAuditAgent";
export {
  SuperiorPerformanceImageAgent,
  getSuperiorPerformanceImageAgent,
  resetSuperiorPerformanceImageAgentForTests,
} from "./SuperiorPerformanceImageAgent";
export {
  SuperiorPerformanceCacheAgent,
  getSuperiorPerformanceCacheAgent,
  resetSuperiorPerformanceCacheAgentForTests,
} from "./SuperiorPerformanceCacheAgent";
export {
  SuperiorPerformanceBundleAgent,
  getSuperiorPerformanceBundleAgent,
  resetSuperiorPerformanceBundleAgentForTests,
} from "./SuperiorPerformanceBundleAgent";
export {
  SuperiorPerformanceDatabaseAgent,
  getSuperiorPerformanceDatabaseAgent,
  resetSuperiorPerformanceDatabaseAgentForTests,
} from "./SuperiorPerformanceDatabaseAgent";
export {
  SuperiorPerformanceMonitorAgent,
  getSuperiorPerformanceMonitorAgent,
  resetSuperiorPerformanceMonitorAgentForTests,
} from "./SuperiorPerformanceMonitorAgent";
export {
  SuperiorPerformanceCDNAgent,
  getSuperiorPerformanceCDNAgent,
  resetSuperiorPerformanceCDNAgentForTests,
} from "./SuperiorPerformanceCDNAgent";
export {
  SuperiorPerformanceReportAgent,
  getSuperiorPerformanceReportAgent,
  resetSuperiorPerformanceReportAgentForTests,
} from "./SuperiorPerformanceReportAgent";

export function resetAllSuperiorPerformanceAgentsForTests(): void {
  SuperiorPerformanceAuditAgent.reset();
  SuperiorPerformanceImageAgent.reset();
  SuperiorPerformanceCacheAgent.reset();
  SuperiorPerformanceBundleAgent.reset();
  SuperiorPerformanceDatabaseAgent.reset();
  SuperiorPerformanceMonitorAgent.reset();
  SuperiorPerformanceCDNAgent.reset();
  SuperiorPerformanceReportAgent.reset();
}
