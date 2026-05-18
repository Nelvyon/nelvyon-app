import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-projectplanning";

export class ProjectPlanningAgent {
  private static inst: ProjectPlanningAgent | undefined;

  static get instance(): ProjectPlanningAgent {
    if (!ProjectPlanningAgent.inst) ProjectPlanningAgent.inst = new ProjectPlanningAgent();
    return ProjectPlanningAgent.inst;
  }

  static reset(): void {
    ProjectPlanningAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **Project Planning** — planificación de proyectos con IA.";
    const mission =
      "Planifica **proyectos**, **dependencias** y **estimaciones IA** con **forecast entrega accuracy >88%**.";
    const fewShot =
      '{"content":"Project planning: dependencias, estimaciones IA, forecast >88%","score":89,"highlights":[">88% forecast","Dependencias"],"metrics":["Delivery forecast"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getProjectPlanningAgent(): ProjectPlanningAgent {
  return ProjectPlanningAgent.instance;
}

export function resetProjectPlanningAgentForTests(): void {
  ProjectPlanningAgent.reset();
}
