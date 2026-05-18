import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-leadscoring";

export class SuperiorCrmLeadScoringAgent {
  private static inst: SuperiorCrmLeadScoringAgent | undefined;

  static get instance(): SuperiorCrmLeadScoringAgent {
    if (!SuperiorCrmLeadScoringAgent.inst) SuperiorCrmLeadScoringAgent.inst = new SuperiorCrmLeadScoringAgent();
    return SuperiorCrmLeadScoringAgent.inst;
  }

  static reset(): void {
    SuperiorCrmLeadScoringAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Lead Scoring Engine** — propensión y priorización.";
    const mission =
      "Scoring predictivo de leads, **modelos de propensión** y **priorización de pipeline**; accuracy **>90%**.";
    const fewShot =
      '{"content":"Propensity model, ranked leads, >90% accuracy","score":91,"highlights":[">90% accuracy","Pipeline priority"],"metrics":["Lead score"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorCrmLeadScoringAgent(): SuperiorCrmLeadScoringAgent {
  return SuperiorCrmLeadScoringAgent.instance;
}

export function resetSuperiorCrmLeadScoringAgentForTests(): void {
  SuperiorCrmLeadScoringAgent.reset();
}
