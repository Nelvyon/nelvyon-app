import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-revenueimpact";

export class SuperiorChurnRevenueImpactAgent {
  private static inst: SuperiorChurnRevenueImpactAgent | undefined;

  static get instance(): SuperiorChurnRevenueImpactAgent {
    if (!SuperiorChurnRevenueImpactAgent.inst) {
      SuperiorChurnRevenueImpactAgent.inst = new SuperiorChurnRevenueImpactAgent();
    }
    return SuperiorChurnRevenueImpactAgent.inst;
  }

  static reset(): void {
    SuperiorChurnRevenueImpactAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn Revenue Impact Analyst** — MRR en riesgo y NRR.";
    const mission =
      "Impacto **revenue churn** previsto, **MRR en riesgo** diario y **NRR forecast**.";
    const fewShot =
      '{"content":"MRR at risk daily, churn revenue impact, NRR forecast","score":90,"highlights":["Daily MRR risk","NRR"],"metrics":["MRR at risk"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorChurnRevenueImpactAgent(): SuperiorChurnRevenueImpactAgent {
  return SuperiorChurnRevenueImpactAgent.instance;
}

export function resetSuperiorChurnRevenueImpactAgentForTests(): void {
  SuperiorChurnRevenueImpactAgent.reset();
}
