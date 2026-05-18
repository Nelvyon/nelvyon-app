import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-analytics";

export class MarketplaceAnalyticsAgent {
  private static inst: MarketplaceAnalyticsAgent | undefined;

  static get instance(): MarketplaceAnalyticsAgent {
    if (!MarketplaceAnalyticsAgent.inst) MarketplaceAnalyticsAgent.inst = new MarketplaceAnalyticsAgent();
    return MarketplaceAnalyticsAgent.inst;
  }

  static reset(): void {
    MarketplaceAnalyticsAgent.inst = undefined;
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
        eliteRole: "ROLE: Marketplace BI; KPI installs, MRR por listing, churn.",
        mission:
          "Métricas: **installs**, **revenue por agente**, **churn rate**; vista por developer y globales.",
        fewShotExample:
          '{"content":"Dashboard listing X: 1.2k installs, churn 4%.","score":92,"highlights":["MRR","Churn"],"metrics":["ARR proxy"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMarketplaceAnalyticsAgent(): MarketplaceAnalyticsAgent {
  return MarketplaceAnalyticsAgent.instance;
}

export function resetMarketplaceAnalyticsAgentForTests(): void {
  MarketplaceAnalyticsAgent.reset();
}
