import { OKRAlignmentAgent } from "./OKRAlignmentAgent";
import { OKRCreationAgent } from "./OKRCreationAgent";
import { OKRTrackingAgent } from "./OKRTrackingAgent";
import { ProjectPlanningAgent } from "./ProjectPlanningAgent";
import { ReportingPMAgent } from "./ReportingPMAgent";
import { ResourceAgent } from "./ResourceAgent";
import { SprintAgent } from "./SprintAgent";
import { TaskAutomationAgent } from "./TaskAutomationAgent";

export type { OkrManagementInput, OkrManagementOutput } from "./shared";
export { parseOkrManagementLlmJson, buildOkrManagementPrompt, llmOpts as okrmanagementLlmOpts } from "./shared";

export { OKRCreationAgent, getOKRCreationAgent, resetOKRCreationAgentForTests } from "./OKRCreationAgent";
export { OKRTrackingAgent, getOKRTrackingAgent, resetOKRTrackingAgentForTests } from "./OKRTrackingAgent";
export { OKRAlignmentAgent, getOKRAlignmentAgent, resetOKRAlignmentAgentForTests } from "./OKRAlignmentAgent";
export {
  ProjectPlanningAgent,
  getProjectPlanningAgent,
  resetProjectPlanningAgentForTests,
} from "./ProjectPlanningAgent";
export {
  TaskAutomationAgent,
  getTaskAutomationAgent,
  resetTaskAutomationAgentForTests,
} from "./TaskAutomationAgent";
export { SprintAgent, getSprintAgent, resetSprintAgentForTests } from "./SprintAgent";
export { ResourceAgent, getResourceAgent, resetResourceAgentForTests } from "./ResourceAgent";
export { ReportingPMAgent, getReportingPMAgent, resetReportingPMAgentForTests } from "./ReportingPMAgent";

export function resetAllOkrManagementAgentsForTests(): void {
  OKRCreationAgent.reset();
  OKRTrackingAgent.reset();
  OKRAlignmentAgent.reset();
  ProjectPlanningAgent.reset();
  TaskAutomationAgent.reset();
  SprintAgent.reset();
  ResourceAgent.reset();
  ReportingPMAgent.reset();
}
