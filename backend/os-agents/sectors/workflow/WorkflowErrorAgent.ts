import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-error";

export class WorkflowErrorAgent {
  private static inst: WorkflowErrorAgent | undefined;

  static get instance(): WorkflowErrorAgent {
    if (!WorkflowErrorAgent.inst) WorkflowErrorAgent.inst = new WorkflowErrorAgent();
    return WorkflowErrorAgent.inst;
  }

  static reset(): void {
    WorkflowErrorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Resilience Engineer** — errores por paso y reintentos exponenciales.";
    const mission =
      "Gestiona **errores y reintentos** en cada paso: **3 intentos** con **backoff exponencial**, dead-letter y compensación.";
    const fewShot =
      '{"content":"3 retries exponential backoff per step DLQ","score":92,"highlights":["Retry x3","Backoff"],"metrics":["Step failure rate"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getWorkflowErrorAgent(): WorkflowErrorAgent {
  return WorkflowErrorAgent.instance;
}

export function resetWorkflowErrorAgentForTests(): void {
  WorkflowErrorAgent.reset();
}
