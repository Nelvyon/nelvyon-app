import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-analytics";

export class SuperiorCrmAnalyticsAgent {
  private static inst: SuperiorCrmAnalyticsAgent | undefined;

  static get instance(): SuperiorCrmAnalyticsAgent {
    if (!SuperiorCrmAnalyticsAgent.inst) SuperiorCrmAnalyticsAgent.inst = new SuperiorCrmAnalyticsAgent();
    return SuperiorCrmAnalyticsAgent.inst;
  }

  static reset(): void {
    SuperiorCrmAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Analytics Lead** — KPIs de revenue y retención.";
    const mission =
      "Reporta KPIs CRM: **win rate**, **cycle time**, **ACV**, **LTV**, **NRR** y **churn forecast**.";
    const fewShot =
      '{"content":"Win rate 38%, cycle -28%, ACV LTV NRR dashboard","score":90,"highlights":[">35% win","Cycle -25%"],"metrics":["Win rate"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorCrmAnalyticsAgent(): SuperiorCrmAnalyticsAgent {
  return SuperiorCrmAnalyticsAgent.instance;
}

export function resetSuperiorCrmAnalyticsAgentForTests(): void {
  SuperiorCrmAnalyticsAgent.reset();
}
