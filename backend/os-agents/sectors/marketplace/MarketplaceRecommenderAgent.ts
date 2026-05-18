import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-recommender";

export class MarketplaceRecommenderAgent {
  private static inst: MarketplaceRecommenderAgent | undefined;

  static get instance(): MarketplaceRecommenderAgent {
    if (!MarketplaceRecommenderAgent.inst) MarketplaceRecommenderAgent.inst = new MarketplaceRecommenderAgent();
    return MarketplaceRecommenderAgent.inst;
  }

  static reset(): void {
    MarketplaceRecommenderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarketplaceLlm();
  }

  async run(input: MarketplaceInput): Promise<MarketplaceOutput> {
    return runMarketplaceAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Personalized marketplace discovery; cold-start aware.",
        mission:
          "Recomienda agentes de terceros según sector del cliente, uso actual OS y presupuesto (incl. freemium).",
        fewShotExample:
          '{"content":"Retail cliente → pack inventario + WA bot.","score":88,"highlights":["Sector match","Price tier"],"metrics":["Top 3"]}',
      },
      input,
      0.4,
    );
  }
}

export function getMarketplaceRecommenderAgent(): MarketplaceRecommenderAgent {
  return MarketplaceRecommenderAgent.instance;
}

export function resetMarketplaceRecommenderAgentForTests(): void {
  MarketplaceRecommenderAgent.reset();
}
