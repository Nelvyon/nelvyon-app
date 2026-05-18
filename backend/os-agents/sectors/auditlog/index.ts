import { AuditAlertDispatcherAgent } from "./AuditAlertDispatcherAgent";
import { AuditAnomalyDetectorAgent } from "./AuditAnomalyDetectorAgent";
import { AuditComplianceReporterAgent } from "./AuditComplianceReporterAgent";
import { AuditEventCaptureAgent } from "./AuditEventCaptureAgent";
import { AuditExportAgent } from "./AuditExportAgent";
import { AuditRetentionManagerAgent } from "./AuditRetentionManagerAgent";
import { AuditRiskScorerAgent } from "./AuditRiskScorerAgent";
import { AuditSessionTrackerAgent } from "./AuditSessionTrackerAgent";

export type { AuditActionType, AuditLogInput, AuditLogOutput } from "./shared";
export { AUDIT_LOG_SECTOR, parseAuditLlmJson, buildAuditPrompt, llmOpts as auditLogLlmOpts } from "./shared";

export {
  AuditEventCaptureAgent,
  getAuditEventCaptureAgent,
  resetAuditEventCaptureAgentForTests,
} from "./AuditEventCaptureAgent";
export {
  AuditAnomalyDetectorAgent,
  getAuditAnomalyDetectorAgent,
  resetAuditAnomalyDetectorAgentForTests,
} from "./AuditAnomalyDetectorAgent";
export {
  AuditRiskScorerAgent,
  getAuditRiskScorerAgent,
  resetAuditRiskScorerAgentForTests,
} from "./AuditRiskScorerAgent";
export {
  AuditSessionTrackerAgent,
  getAuditSessionTrackerAgent,
  resetAuditSessionTrackerAgentForTests,
} from "./AuditSessionTrackerAgent";
export {
  AuditComplianceReporterAgent,
  getAuditComplianceReporterAgent,
  resetAuditComplianceReporterAgentForTests,
} from "./AuditComplianceReporterAgent";
export {
  AuditRetentionManagerAgent,
  getAuditRetentionManagerAgent,
  resetAuditRetentionManagerAgentForTests,
} from "./AuditRetentionManagerAgent";
export {
  AuditExportAgent,
  getAuditExportAgent,
  resetAuditExportAgentForTests,
} from "./AuditExportAgent";
export {
  AuditAlertDispatcherAgent,
  getAuditAlertDispatcherAgent,
  resetAuditAlertDispatcherAgentForTests,
} from "./AuditAlertDispatcherAgent";

export function resetAllAuditLogAgentsForTests(): void {
  AuditEventCaptureAgent.reset();
  AuditAnomalyDetectorAgent.reset();
  AuditRiskScorerAgent.reset();
  AuditSessionTrackerAgent.reset();
  AuditComplianceReporterAgent.reset();
  AuditRetentionManagerAgent.reset();
  AuditExportAgent.reset();
  AuditAlertDispatcherAgent.reset();
}
