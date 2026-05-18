import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-listing";

export class MarketplaceListingAgent {
  private static inst: MarketplaceListingAgent | undefined;

  static get instance(): MarketplaceListingAgent {
    if (!MarketplaceListingAgent.inst) MarketplaceListingAgent.inst = new MarketplaceListingAgent();
    return MarketplaceListingAgent.inst;
  }

  static reset(): void {
    MarketplaceListingAgent.inst = undefined;
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
        eliteRole: "ROLE: Marketplace publisher; cumple precio mínimo 9€ o freemium declarado.",
        mission:
          "Crea y publica listing de agente de terceros: nombre, descripción, precio (≥9€/mes o gratis), categoría; referencia fila marketplace_listings.",
        fewShotExample:
          '{"content":"Listing publicado ProSEO plugin; 19€/mes.","score":90,"highlights":["≥9€","QA previo"],"metrics":["listing_agent_id"]}',
      },
      input,
      0.5,
    );
  }
}

export function getMarketplaceListingAgent(): MarketplaceListingAgent {
  return MarketplaceListingAgent.instance;
}

export function resetMarketplaceListingAgentForTests(): void {
  MarketplaceListingAgent.reset();
}
