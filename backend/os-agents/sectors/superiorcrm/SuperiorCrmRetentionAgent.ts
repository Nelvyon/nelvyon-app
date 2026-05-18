import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-retention";

export class SuperiorCrmRetentionAgent {
  private static inst: SuperiorCrmRetentionAgent | undefined;

  static get instance(): SuperiorCrmRetentionAgent {
    if (!SuperiorCrmRetentionAgent.inst) SuperiorCrmRetentionAgent.inst = new SuperiorCrmRetentionAgent();
    return SuperiorCrmRetentionAgent.inst;
  }

  static reset(): void {
    SuperiorCrmRetentionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Retention Strategist** — churn temprano y playbooks.";
    const mission =
      "Detecta **señales de churn >30 días** antes, **playbooks de retención** y **alertas de health score**.";
    const fewShot =
      '{"content":"Churn signals 35d early, retention playbook, health alerts","score":89,"highlights":[">30d early","Health score"],"metrics":["Churn risk"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorCrmRetentionAgent(): SuperiorCrmRetentionAgent {
  return SuperiorCrmRetentionAgent.instance;
}

export function resetSuperiorCrmRetentionAgentForTests(): void {
  SuperiorCrmRetentionAgent.reset();
}
