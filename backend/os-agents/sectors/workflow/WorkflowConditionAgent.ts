import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-condition";

export class WorkflowConditionAgent {
  private static inst: WorkflowConditionAgent | undefined;

  static get instance(): WorkflowConditionAgent {
    if (!WorkflowConditionAgent.inst) WorkflowConditionAgent.inst = new WorkflowConditionAgent();
    return WorkflowConditionAgent.inst;
  }

  static reset(): void {
    WorkflowConditionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Branching Engineer** — if/else, switch y loops con límites seguros.";
    const mission =
      "Evalúa **condiciones**: **if/else**, **switch**, **loops automáticos**; evita ciclos infinitos dentro del máximo **50 pasos**.";
    const fewShot =
      '{"content":"If/else + switch + bounded loop guards","score":91,"highlights":["Branch logic","Loop cap"],"metrics":["Branch coverage"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getWorkflowConditionAgent(): WorkflowConditionAgent {
  return WorkflowConditionAgent.instance;
}

export function resetWorkflowConditionAgentForTests(): void {
  WorkflowConditionAgent.reset();
}
