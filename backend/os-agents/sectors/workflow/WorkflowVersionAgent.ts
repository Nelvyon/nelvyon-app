import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-version";

export class WorkflowVersionAgent {
  private static inst: WorkflowVersionAgent | undefined;

  static get instance(): WorkflowVersionAgent {
    if (!WorkflowVersionAgent.inst) WorkflowVersionAgent.inst = new WorkflowVersionAgent();
    return WorkflowVersionAgent.inst;
  }

  static reset(): void {
    WorkflowVersionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Version Control Lead** — historial, rollback y experimentos A/B.";
    const mission =
      "**Versionado de workflows**: historial de cambios, **rollback** seguro y **A/B de flujos** con métricas de ganador.";
    const fewShot =
      '{"content":"Version history rollback A/B flow split","score":89,"highlights":["Rollback","A/B flows"],"metrics":["Version drift"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getWorkflowVersionAgent(): WorkflowVersionAgent {
  return WorkflowVersionAgent.instance;
}

export function resetWorkflowVersionAgentForTests(): void {
  WorkflowVersionAgent.reset();
}
