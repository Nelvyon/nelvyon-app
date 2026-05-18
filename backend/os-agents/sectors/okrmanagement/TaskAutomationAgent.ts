import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-taskautomation";

export class TaskAutomationAgent {
  private static inst: TaskAutomationAgent | undefined;

  static get instance(): TaskAutomationAgent {
    if (!TaskAutomationAgent.inst) TaskAutomationAgent.inst = new TaskAutomationAgent();
    return TaskAutomationAgent.inst;
  }

  static reset(): void {
    TaskAutomationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **Task Automation** — tareas automáticas por contexto.";
    const mission =
      "Crea y asigna **tareas automáticas por contexto**; **0 reuniones de seguimiento** necesarias.";
    const fewShot =
      '{"content":"Task automation: creación/asignación por contexto, 0 reuniones","score":90,"highlights":["0 reuniones","Auto assign"],"metrics":["Task automation"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getTaskAutomationAgent(): TaskAutomationAgent {
  return TaskAutomationAgent.instance;
}

export function resetTaskAutomationAgentForTests(): void {
  TaskAutomationAgent.reset();
}
