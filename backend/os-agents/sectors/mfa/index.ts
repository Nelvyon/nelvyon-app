import { MfaAnomalyDetectorAgent } from "./MfaAnomalyDetectorAgent";
import { MfaComplianceCheckerAgent } from "./MfaComplianceCheckerAgent";
import { MfaIncidentResponseAgent } from "./MfaIncidentResponseAgent";
import { MfaPolicyGeneratorAgent } from "./MfaPolicyGeneratorAgent";
import { MfaRecoveryFlowAgent } from "./MfaRecoveryFlowAgent";
import { MfaRiskAssessorAgent } from "./MfaRiskAssessorAgent";
import { MfaSetupGuideAgent } from "./MfaSetupGuideAgent";
import { MfaUserEducationAgent } from "./MfaUserEducationAgent";

export type { MfaInput, MfaOutput, MfaMethod, MfaRiskLevel } from "./shared";
export { parseMfaLlmJson, buildSecurePrompt, llmOpts as mfaLlmOpts } from "./shared";

export {
  MfaSetupGuideAgent,
  getMfaSetupGuideAgent,
  resetMfaSetupGuideAgentForTests,
} from "./MfaSetupGuideAgent";
export {
  MfaRiskAssessorAgent,
  getMfaRiskAssessorAgent,
  resetMfaRiskAssessorAgentForTests,
} from "./MfaRiskAssessorAgent";
export {
  MfaRecoveryFlowAgent,
  getMfaRecoveryFlowAgent,
  resetMfaRecoveryFlowAgentForTests,
} from "./MfaRecoveryFlowAgent";
export {
  MfaComplianceCheckerAgent,
  getMfaComplianceCheckerAgent,
  resetMfaComplianceCheckerAgentForTests,
} from "./MfaComplianceCheckerAgent";
export {
  MfaUserEducationAgent,
  getMfaUserEducationAgent,
  resetMfaUserEducationAgentForTests,
} from "./MfaUserEducationAgent";
export {
  MfaAnomalyDetectorAgent,
  getMfaAnomalyDetectorAgent,
  resetMfaAnomalyDetectorAgentForTests,
} from "./MfaAnomalyDetectorAgent";
export {
  MfaPolicyGeneratorAgent,
  getMfaPolicyGeneratorAgent,
  resetMfaPolicyGeneratorAgentForTests,
} from "./MfaPolicyGeneratorAgent";
export {
  MfaIncidentResponseAgent,
  getMfaIncidentResponseAgent,
  resetMfaIncidentResponseAgentForTests,
} from "./MfaIncidentResponseAgent";

export function resetAllMfaAgentsForTests(): void {
  MfaSetupGuideAgent.reset();
  MfaRiskAssessorAgent.reset();
  MfaRecoveryFlowAgent.reset();
  MfaComplianceCheckerAgent.reset();
  MfaUserEducationAgent.reset();
  MfaAnomalyDetectorAgent.reset();
  MfaPolicyGeneratorAgent.reset();
  MfaIncidentResponseAgent.reset();
}
