import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-marketintel";

export class MarketIntelAgent {
  private static inst: MarketIntelAgent | undefined;

  static get instance(): MarketIntelAgent {
    if (!MarketIntelAgent.inst) MarketIntelAgent.inst = new MarketIntelAgent();
    return MarketIntelAgent.inst;
  }

  static reset(): void {
    MarketIntelAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Market Intel** — tendencias e ICP.";
    const mission =
      "Detecta **tendencias de mercado**, **refinamiento ICP** y **nuevos segmentos** para **sales cycle reduction >35%**.";
    const fewShot =
      '{"content":"Market intel: tendencias, ICP refinement, segmentos, cycle -35%","score":88,"highlights":["ICP refinement",">35% cycle cut"],"metrics":["Sales cycle reduction"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getMarketIntelAgent(): MarketIntelAgent {
  return MarketIntelAgent.instance;
}

export function resetMarketIntelAgentForTests(): void {
  MarketIntelAgent.reset();
}
