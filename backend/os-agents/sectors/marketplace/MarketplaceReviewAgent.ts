import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-review";

export class MarketplaceReviewAgent {
  private static inst: MarketplaceReviewAgent | undefined;

  static get instance(): MarketplaceReviewAgent {
    if (!MarketplaceReviewAgent.inst) MarketplaceReviewAgent.inst = new MarketplaceReviewAgent();
    return MarketplaceReviewAgent.inst;
  }

  static reset(): void {
    MarketplaceReviewAgent.inst = undefined;
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
        eliteRole: "ROLE: Trust & safety reviews; rating medio vs umbral 3.5/5.",
        mission:
          "Gestiona reviews y ratings de agentes publicados; alerta si rating cae bajo 3.5/5 para revisión de listing.",
        fewShotExample:
          '{"content":"Agregación reviews 4.2/5; listing safe.","score":88,"highlights":["Umbral 3.5","Moderación"],"metrics":["N reviews"]}',
      },
      input,
      0.4,
    );
  }
}

export function getMarketplaceReviewAgent(): MarketplaceReviewAgent {
  return MarketplaceReviewAgent.instance;
}

export function resetMarketplaceReviewAgentForTests(): void {
  MarketplaceReviewAgent.reset();
}
