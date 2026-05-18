import { WorkflowAnalyticsAgent } from "./WorkflowAnalyticsAgent";
import { WorkflowBuilderAgent } from "./WorkflowBuilderAgent";
import { WorkflowConditionAgent } from "./WorkflowConditionAgent";
import { WorkflowErrorAgent } from "./WorkflowErrorAgent";
import { WorkflowExecutorAgent } from "./WorkflowExecutorAgent";
import { WorkflowTemplateAgent } from "./WorkflowTemplateAgent";
import { WorkflowTriggerAgent } from "./WorkflowTriggerAgent";
import { WorkflowVersionAgent } from "./WorkflowVersionAgent";

export type { WorkflowInput, WorkflowOutput } from "./shared";
export { parseWorkflowLlmJson, buildWorkflowPrompt, llmOpts as workflowLlmOpts } from "./shared";

export {
  WorkflowBuilderAgent,
  getWorkflowBuilderAgent,
  resetWorkflowBuilderAgentForTests,
} from "./WorkflowBuilderAgent";
export {
  WorkflowExecutorAgent,
  getWorkflowExecutorAgent,
  resetWorkflowExecutorAgentForTests,
} from "./WorkflowExecutorAgent";
export {
  WorkflowConditionAgent,
  getWorkflowConditionAgent,
  resetWorkflowConditionAgentForTests,
} from "./WorkflowConditionAgent";
export {
  WorkflowTriggerAgent,
  getWorkflowTriggerAgent,
  resetWorkflowTriggerAgentForTests,
} from "./WorkflowTriggerAgent";
export {
  WorkflowErrorAgent,
  getWorkflowErrorAgent,
  resetWorkflowErrorAgentForTests,
} from "./WorkflowErrorAgent";
export {
  WorkflowTemplateAgent,
  getWorkflowTemplateAgent,
  resetWorkflowTemplateAgentForTests,
} from "./WorkflowTemplateAgent";
export {
  WorkflowAnalyticsAgent,
  getWorkflowAnalyticsAgent,
  resetWorkflowAnalyticsAgentForTests,
} from "./WorkflowAnalyticsAgent";
export {
  WorkflowVersionAgent,
  getWorkflowVersionAgent,
  resetWorkflowVersionAgentForTests,
} from "./WorkflowVersionAgent";

export function resetAllWorkflowAgentsForTests(): void {
  WorkflowBuilderAgent.reset();
  WorkflowExecutorAgent.reset();
  WorkflowConditionAgent.reset();
  WorkflowTriggerAgent.reset();
  WorkflowErrorAgent.reset();
  WorkflowTemplateAgent.reset();
  WorkflowAnalyticsAgent.reset();
  WorkflowVersionAgent.reset();
}
