import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-competitorintel";

export class CompetitorIntelAgent {
  private static inst: CompetitorIntelAgent | undefined;

  static get instance(): CompetitorIntelAgent {
    if (!CompetitorIntelAgent.inst) CompetitorIntelAgent.inst = new CompetitorIntelAgent();
    return CompetitorIntelAgent.inst;
  }

  static reset(): void {
    CompetitorIntelAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Competitor Intel** — inteligencia competitiva.";
    const mission =
      "Monitoriza **movimientos competidores**, **cambios de pricing** y **product launches** para acciones comerciales.";
    const fewShot =
      '{"content":"Competitor intel: pricing changes, launches, movimientos competidores","score":89,"highlights":["Pricing changes","Product launches"],"metrics":["Competitive signals"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getCompetitorIntelAgent(): CompetitorIntelAgent {
  return CompetitorIntelAgent.instance;
}

export function resetCompetitorIntelAgentForTests(): void {
  CompetitorIntelAgent.reset();
}
