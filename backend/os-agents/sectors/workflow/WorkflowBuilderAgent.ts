import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-builder";

export class WorkflowBuilderAgent {
  private static inst: WorkflowBuilderAgent | undefined;

  static get instance(): WorkflowBuilderAgent {
    if (!WorkflowBuilderAgent.inst) WorkflowBuilderAgent.inst = new WorkflowBuilderAgent();
    return WorkflowBuilderAgent.inst;
  }

  static reset(): void {
    WorkflowBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Visual Builder Architect** — diseño multi-paso por sector con límite 50 pasos.";
    const mission =
      "Crea **workflows visuales multi-paso** por sector; nodos, ramas y guardrails; máximo **50 pasos** y plantillas onboarding/nurturing/churn/upsell.";
    const fewShot =
      '{"content":"8-step onboarding graph sector-specific max 50","score":90,"highlights":["Visual steps","Sector map"],"metrics":["Step count"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getWorkflowBuilderAgent(): WorkflowBuilderAgent {
  return WorkflowBuilderAgent.instance;
}

export function resetWorkflowBuilderAgentForTests(): void {
  WorkflowBuilderAgent.reset();
}
