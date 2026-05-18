import { ChurnRiskAgent } from "./ChurnRiskAgent";
import { CustomerROIAgent } from "./CustomerROIAgent";
import { EscalationAgent } from "./EscalationAgent";
import { ExpansionAgent } from "./ExpansionAgent";
import { HealthScoreAgent } from "./HealthScoreAgent";
import { OnboardingSuccessAgent } from "./OnboardingSuccessAgent";
import { PlaybookCSAgent } from "./PlaybookCSAgent";
import { QBRAgent } from "./QBRAgent";

export type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
export { parseCustomerSuccessLlmJson, buildCustomerSuccessPrompt, llmOpts as customersuccessLlmOpts } from "./shared";

export { HealthScoreAgent, getHealthScoreAgent, resetHealthScoreAgentForTests } from "./HealthScoreAgent";
export { ChurnRiskAgent, getChurnRiskAgent, resetChurnRiskAgentForTests } from "./ChurnRiskAgent";
export {
  OnboardingSuccessAgent,
  getOnboardingSuccessAgent,
  resetOnboardingSuccessAgentForTests,
} from "./OnboardingSuccessAgent";
export { ExpansionAgent, getExpansionAgent, resetExpansionAgentForTests } from "./ExpansionAgent";
export { QBRAgent, getQBRAgent, resetQBRAgentForTests } from "./QBRAgent";
export { PlaybookCSAgent, getPlaybookCSAgent, resetPlaybookCSAgentForTests } from "./PlaybookCSAgent";
export { CustomerROIAgent, getCustomerROIAgent, resetCustomerROIAgentForTests } from "./CustomerROIAgent";
export { EscalationAgent, getEscalationAgent, resetEscalationAgentForTests } from "./EscalationAgent";

export function resetAllCustomerSuccessAgentsForTests(): void {
  HealthScoreAgent.reset();
  ChurnRiskAgent.reset();
  OnboardingSuccessAgent.reset();
  ExpansionAgent.reset();
  QBRAgent.reset();
  PlaybookCSAgent.reset();
  CustomerROIAgent.reset();
  EscalationAgent.reset();
}
