import { ComplianceControlMapperAgent } from "./ComplianceControlMapperAgent";
import { ComplianceEvidenceCheckerAgent } from "./ComplianceEvidenceCheckerAgent";
import { ComplianceGapAnalyzerAgent } from "./ComplianceGapAnalyzerAgent";
import { ComplianceIncidentPlanAgent } from "./ComplianceIncidentPlanAgent";
import { CompliancePolicyDrafterAgent } from "./CompliancePolicyDrafterAgent";
import { ComplianceReadinessReportAgent } from "./ComplianceReadinessReportAgent";
import { ComplianceRiskRegisterAgent } from "./ComplianceRiskRegisterAgent";
import { ComplianceVendorAssessorAgent } from "./ComplianceVendorAssessorAgent";

export type { ComplianceInput, ComplianceOutput } from "./shared";
export { parseComplianceLlmJson, buildComplyPrompt, llmOpts as complianceLlmOpts } from "./shared";

export {
  ComplianceGapAnalyzerAgent,
  getComplianceGapAnalyzerAgent,
  resetComplianceGapAnalyzerAgentForTests,
} from "./ComplianceGapAnalyzerAgent";
export {
  ComplianceControlMapperAgent,
  getComplianceControlMapperAgent,
  resetComplianceControlMapperAgentForTests,
} from "./ComplianceControlMapperAgent";
export {
  CompliancePolicyDrafterAgent,
  getCompliancePolicyDrafterAgent,
  resetCompliancePolicyDrafterAgentForTests,
} from "./CompliancePolicyDrafterAgent";
export {
  ComplianceRiskRegisterAgent,
  getComplianceRiskRegisterAgent,
  resetComplianceRiskRegisterAgentForTests,
} from "./ComplianceRiskRegisterAgent";
export {
  ComplianceEvidenceCheckerAgent,
  getComplianceEvidenceCheckerAgent,
  resetComplianceEvidenceCheckerAgentForTests,
} from "./ComplianceEvidenceCheckerAgent";
export {
  ComplianceVendorAssessorAgent,
  getComplianceVendorAssessorAgent,
  resetComplianceVendorAssessorAgentForTests,
} from "./ComplianceVendorAssessorAgent";
export {
  ComplianceIncidentPlanAgent,
  getComplianceIncidentPlanAgent,
  resetComplianceIncidentPlanAgentForTests,
} from "./ComplianceIncidentPlanAgent";
export {
  ComplianceReadinessReportAgent,
  getComplianceReadinessReportAgent,
  resetComplianceReadinessReportAgentForTests,
} from "./ComplianceReadinessReportAgent";

export function resetAllComplianceAgentsForTests(): void {
  ComplianceGapAnalyzerAgent.reset();
  ComplianceControlMapperAgent.reset();
  CompliancePolicyDrafterAgent.reset();
  ComplianceRiskRegisterAgent.reset();
  ComplianceEvidenceCheckerAgent.reset();
  ComplianceVendorAssessorAgent.reset();
  ComplianceIncidentPlanAgent.reset();
  ComplianceReadinessReportAgent.reset();
}
