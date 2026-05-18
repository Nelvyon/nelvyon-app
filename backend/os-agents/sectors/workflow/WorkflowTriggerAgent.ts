import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-trigger";

export class WorkflowTriggerAgent {
  private static inst: WorkflowTriggerAgent | undefined;

  static get instance(): WorkflowTriggerAgent {
    if (!WorkflowTriggerAgent.inst) WorkflowTriggerAgent.inst = new WorkflowTriggerAgent();
    return WorkflowTriggerAgent.inst;
  }

  static reset(): void {
    WorkflowTriggerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Trigger Designer** — arranque por evento, cron, webhook o manual.";
    const mission =
      "Define **triggers**: **evento**, **schedule**, **webhook**, **manual**; deduplicación y ventanas de elegibilidad por sector.";
    const fewShot =
      '{"content":"Event+schedule+webhook+manual trigger matrix","score":89,"highlights":["Webhook","Cron"],"metrics":["Trigger volume"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getWorkflowTriggerAgent(): WorkflowTriggerAgent {
  return WorkflowTriggerAgent.instance;
}

export function resetWorkflowTriggerAgentForTests(): void {
  WorkflowTriggerAgent.reset();
}
