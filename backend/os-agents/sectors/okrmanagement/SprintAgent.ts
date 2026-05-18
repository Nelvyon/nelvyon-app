import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-sprint";

export class SprintAgent {
  private static inst: SprintAgent | undefined;

  static get instance(): SprintAgent {
    if (!SprintAgent.inst) SprintAgent.inst = new SprintAgent();
    return SprintAgent.inst;
  }

  static reset(): void {
    SprintAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **Sprint** — gestión ágil de sprints.";
    const mission =
      "Gestiona **sprints**, **velocity**, **burndown** y **retrospectivas automáticas**; **velocity +20%** mes a mes con IA.";
    const fewShot =
      '{"content":"Sprint: velocity, burndown, retrospectivas auto, +20% velocity","score":88,"highlights":["+20% velocity","Burndown auto"],"metrics":["Sprint velocity"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getSprintAgent(): SprintAgent {
  return SprintAgent.instance;
}

export function resetSprintAgentForTests(): void {
  SprintAgent.reset();
}
