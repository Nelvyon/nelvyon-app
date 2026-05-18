import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-pricing";

export class SuperiorCompetitivePricingAgent {
  private static inst: SuperiorCompetitivePricingAgent | undefined;

  static get instance(): SuperiorCompetitivePricingAgent {
    if (!SuperiorCompetitivePricingAgent.inst) SuperiorCompetitivePricingAgent.inst = new SuperiorCompetitivePricingAgent();
    return SuperiorCompetitivePricingAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitivePricingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Pricing** — análisis de pricing rival.";
    const mission =
      "Analiza **pricing competidores**, posicionamiento y **detección de cambios de precio**; alertas **<30 min**.";
    const fewShot =
      '{"content":"Competitor pricing map, positioning, price change detection","score":87,"highlights":["Price deltas","Positioning"],"metrics":["Price change SLA"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorCompetitivePricingAgent(): SuperiorCompetitivePricingAgent {
  return SuperiorCompetitivePricingAgent.instance;
}

export function resetSuperiorCompetitivePricingAgentForTests(): void {
  SuperiorCompetitivePricingAgent.reset();
}
