import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-template";

export class WorkflowTemplateAgent {
  private static inst: WorkflowTemplateAgent | undefined;

  static get instance(): WorkflowTemplateAgent {
    if (!WorkflowTemplateAgent.inst) WorkflowTemplateAgent.inst = new WorkflowTemplateAgent();
    return WorkflowTemplateAgent.inst;
  }

  static reset(): void {
    WorkflowTemplateAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Template Librarian** — blueprints sectoriales listos para clonar.";
    const mission =
      "Librería **templates por sector**: **Onboarding 8**, **Nurturing B2B 12**, **Churn rescue 5**, **Upsell 4** pasos; personalización por marca.";
    const fewShot =
      '{"content":"Onboarding8 B2B12 Churn5 Upsell4 templates","score":90,"highlights":["Onboarding 8","Churn 5"],"metrics":["Template adoption"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getWorkflowTemplateAgent(): WorkflowTemplateAgent {
  return WorkflowTemplateAgent.instance;
}

export function resetWorkflowTemplateAgentForTests(): void {
  WorkflowTemplateAgent.reset();
}
