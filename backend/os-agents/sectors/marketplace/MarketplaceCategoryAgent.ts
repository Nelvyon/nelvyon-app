import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-category";

export class MarketplaceCategoryAgent {
  private static inst: MarketplaceCategoryAgent | undefined;

  static get instance(): MarketplaceCategoryAgent {
    if (!MarketplaceCategoryAgent.inst) MarketplaceCategoryAgent.inst = new MarketplaceCategoryAgent();
    return MarketplaceCategoryAgent.inst;
  }

  static reset(): void {
    MarketplaceCategoryAgent.inst = undefined;
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
        eliteRole: "ROLE: Taxonomy bot; alinea categoría OS sector.",
        mission:
          "Organiza agentes por categoría y sector automáticamente (multi-etiqueta, árbol NELVYON OS).",
        fewShotExample:
          '{"content":"Listing → categorías SEO + Automation.","score":87,"highlights":["Multi-tag","Sector"],"metrics":["Primary cat"]}',
      },
      input,
      0.5,
    );
  }
}

export function getMarketplaceCategoryAgent(): MarketplaceCategoryAgent {
  return MarketplaceCategoryAgent.instance;
}

export function resetMarketplaceCategoryAgentForTests(): void {
  MarketplaceCategoryAgent.reset();
}
