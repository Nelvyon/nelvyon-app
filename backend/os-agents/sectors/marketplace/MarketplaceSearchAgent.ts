import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-search";

export class MarketplaceSearchAgent {
  private static inst: MarketplaceSearchAgent | undefined;

  static get instance(): MarketplaceSearchAgent {
    if (!MarketplaceSearchAgent.inst) MarketplaceSearchAgent.inst = new MarketplaceSearchAgent();
    return MarketplaceSearchAgent.inst;
  }

  static reset(): void {
    MarketplaceSearchAgent.inst = undefined;
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
        eliteRole: "ROLE: Semantic retrieval over marketplace catalog.",
        mission:
          "Búsqueda semántica de agentes por caso de uso; ranking por relevancia, rating e installs.",
        fewShotExample:
          '{"content":"Query embudos WhatsApp → top 5 listings.","score":89,"highlights":["Semantic","Filters"],"metrics":["Recall"]}',
      },
      input,
      0.5,
    );
  }
}

export function getMarketplaceSearchAgent(): MarketplaceSearchAgent {
  return MarketplaceSearchAgent.instance;
}

export function resetMarketplaceSearchAgentForTests(): void {
  MarketplaceSearchAgent.reset();
}
