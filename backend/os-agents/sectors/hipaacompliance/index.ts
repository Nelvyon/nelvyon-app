import { AccessControlAgent } from "./AccessControlAgent";
import { BAAAgreementAgent } from "./BAAAgreementAgent";
import { BreachDetectionAgent } from "./BreachDetectionAgent";
import { HipaaAuditAgent } from "./HipaaAuditAgent";
import { HipaaReportingAgent } from "./HipaaReportingAgent";
import { HipaaTrainingAgent } from "./HipaaTrainingAgent";
import { PHIDetectionAgent } from "./PHIDetectionAgent";
import { PHIEncryptionAgent } from "./PHIEncryptionAgent";

export type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
export { parseHipaaComplianceLlmJson, buildHipaaCompliancePrompt, llmOpts as hipaacomplianceLlmOpts } from "./shared";

export { HipaaAuditAgent, getHipaaAuditAgent, resetHipaaAuditAgentForTests } from "./HipaaAuditAgent";
export { PHIDetectionAgent, getPHIDetectionAgent, resetPHIDetectionAgentForTests } from "./PHIDetectionAgent";
export { PHIEncryptionAgent, getPHIEncryptionAgent, resetPHIEncryptionAgentForTests } from "./PHIEncryptionAgent";
export { AccessControlAgent, getAccessControlAgent, resetAccessControlAgentForTests } from "./AccessControlAgent";
export {
  BreachDetectionAgent,
  getBreachDetectionAgent,
  resetBreachDetectionAgentForTests,
} from "./BreachDetectionAgent";
export { BAAAgreementAgent, getBAAAgreementAgent, resetBAAAgreementAgentForTests } from "./BAAAgreementAgent";
export { HipaaTrainingAgent, getHipaaTrainingAgent, resetHipaaTrainingAgentForTests } from "./HipaaTrainingAgent";
export {
  HipaaReportingAgent,
  getHipaaReportingAgent,
  resetHipaaReportingAgentForTests,
} from "./HipaaReportingAgent";

export function resetAllHipaaComplianceAgentsForTests(): void {
  HipaaAuditAgent.reset();
  PHIDetectionAgent.reset();
  PHIEncryptionAgent.reset();
  AccessControlAgent.reset();
  BreachDetectionAgent.reset();
  BAAAgreementAgent.reset();
  HipaaTrainingAgent.reset();
  HipaaReportingAgent.reset();
}
