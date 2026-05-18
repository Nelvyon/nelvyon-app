import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-payout";

export class MarketplacePayoutAgent {
  private static inst: MarketplacePayoutAgent | undefined;

  static get instance(): MarketplacePayoutAgent {
    if (!MarketplacePayoutAgent.inst) MarketplacePayoutAgent.inst = new MarketplacePayoutAgent();
    return MarketplacePayoutAgent.inst;
  }

  static reset(): void {
    MarketplacePayoutAgent.inst = undefined;
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
        eliteRole: "ROLE: Revenue share accountant; split fijo 70/30.",
        mission:
          "Calcula y describe pagos a desarrolladores: **70% desarrollador**, **30% NELVYON** sobre ingresos netos del listing; liquidación orientativa.",
        fewShotExample:
          '{"content":"100€ cobrados → 70€ dev, 30€ plataforma.","score":94,"highlights":["70/30","Neto"],"metrics":["EUR dev"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMarketplacePayoutAgent(): MarketplacePayoutAgent {
  return MarketplacePayoutAgent.instance;
}

export function resetMarketplacePayoutAgentForTests(): void {
  MarketplacePayoutAgent.reset();
}
