import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-executor";

export class WorkflowExecutorAgent {
  private static inst: WorkflowExecutorAgent | undefined;

  static get instance(): WorkflowExecutorAgent {
    if (!WorkflowExecutorAgent.inst) WorkflowExecutorAgent.inst = new WorkflowExecutorAgent();
    return WorkflowExecutorAgent.inst;
  }

  static reset(): void {
    WorkflowExecutorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Step Executor** — orquestación secuencial con estado durable.";
    const mission =
      "Ejecuta workflows **paso a paso** con **estado persistente**; checkpoints, idempotencia y reanudación tras fallo.";
    const fewShot =
      '{"content":"Persistent run state per step checkpoint resume","score":93,"highlights":["Step runner","Durable state"],"metrics":["Completion rate"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getWorkflowExecutorAgent(): WorkflowExecutorAgent {
  return WorkflowExecutorAgent.instance;
}

export function resetWorkflowExecutorAgentForTests(): void {
  WorkflowExecutorAgent.reset();
}
