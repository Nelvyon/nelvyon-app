import { ComplianceHRAgent } from "./ComplianceHRAgent";
import { EngagementAgent } from "./EngagementAgent";
import { HRAnalyticsAgent } from "./HRAnalyticsAgent";
import { OnboardingHRAgent } from "./OnboardingHRAgent";
import { PayrollAgent } from "./PayrollAgent";
import { PerformanceAgent } from "./PerformanceAgent";
import { RecruitmentAgent } from "./RecruitmentAgent";
import { TrainingAgent } from "./TrainingAgent";

export type { HrTechInput, HrTechOutput } from "./shared";
export { parseHrTechLlmJson, buildHrTechPrompt, llmOpts as hrtechLlmOpts } from "./shared";

export {
  RecruitmentAgent,
  getRecruitmentAgent,
  resetRecruitmentAgentForTests,
} from "./RecruitmentAgent";
export {
  OnboardingHRAgent,
  getOnboardingHRAgent,
  resetOnboardingHRAgentForTests,
} from "./OnboardingHRAgent";
export { PerformanceAgent, getPerformanceAgent, resetPerformanceAgentForTests } from "./PerformanceAgent";
export { EngagementAgent, getEngagementAgent, resetEngagementAgentForTests } from "./EngagementAgent";
export { PayrollAgent, getPayrollAgent, resetPayrollAgentForTests } from "./PayrollAgent";
export { TrainingAgent, getTrainingAgent, resetTrainingAgentForTests } from "./TrainingAgent";
export {
  ComplianceHRAgent,
  getComplianceHRAgent,
  resetComplianceHRAgentForTests,
} from "./ComplianceHRAgent";
export { HRAnalyticsAgent, getHRAnalyticsAgent, resetHRAnalyticsAgentForTests } from "./HRAnalyticsAgent";

export function resetAllHrTechAgentsForTests(): void {
  RecruitmentAgent.reset();
  OnboardingHRAgent.reset();
  PerformanceAgent.reset();
  EngagementAgent.reset();
  PayrollAgent.reset();
  TrainingAgent.reset();
  ComplianceHRAgent.reset();
  HRAnalyticsAgent.reset();
}
