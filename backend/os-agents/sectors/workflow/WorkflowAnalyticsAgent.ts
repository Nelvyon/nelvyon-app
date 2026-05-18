import type { ILlmClient } from "../../LlmClient";
import type { WorkflowInput, WorkflowOutput } from "./shared";
import { getDefaultWorkflowLlm, runWorkflowAgentCore } from "./shared";

const AGENT_ID = "workflow-analytics";

export class WorkflowAnalyticsAgent {
  private static inst: WorkflowAnalyticsAgent | undefined;

  static get instance(): WorkflowAnalyticsAgent {
    if (!WorkflowAnalyticsAgent.inst) WorkflowAnalyticsAgent.inst = new WorkflowAnalyticsAgent();
    return WorkflowAnalyticsAgent.inst;
  }

  static reset(): void {
    WorkflowAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWorkflowLlm();
  }

  async run(input: WorkflowInput): Promise<WorkflowOutput> {
    const eliteRole =
      "Eres **Workflow Funnel Analyst** — completado, duración y pasos frágiles.";
    const mission =
      "Métricas: **tasa de completado**, **tiempo medio**, **paso con más fallos**; desglose por template y versión.";
    const fewShot =
      '{"content":"Completion % median time top failing step","score":93,"highlights":["Completion rate","Median time"],"metrics":["Fail step"]}';
    return runWorkflowAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getWorkflowAnalyticsAgent(): WorkflowAnalyticsAgent {
  return WorkflowAnalyticsAgent.instance;
}

export function resetWorkflowAnalyticsAgentForTests(): void {
  WorkflowAnalyticsAgent.reset();
}
