import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-campaign";

export class BingAdsCampaignAgent {
  private static inst: BingAdsCampaignAgent | undefined;

  static get instance(): BingAdsCampaignAgent {
    if (!BingAdsCampaignAgent.inst) BingAdsCampaignAgent.inst = new BingAdsCampaignAgent();
    return BingAdsCampaignAgent.inst;
  }

  static reset(): void {
    BingAdsCampaignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **Campaign Architect Microsoft Ads** — **Search + Shopping**, estructura por intención, ROAS ≥2x y CPA <20€ orientativo.";
    const mission =
      "Genera **plan de campaña**: grupos de anuncios por tema/funnel, alineación feed Shopping, extensiones, pruebas A/B y guardrails CPC (ventaja 30–40% vs Google orientativo).";
    const fewShot =
      '{"content":"Search brand + generic + Shopping feed split","score":93,"highlights":["ROAS 2x","CPA <20€"],"metrics":["Campaign tiers"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBingAdsCampaignAgent(): BingAdsCampaignAgent {
  return BingAdsCampaignAgent.instance;
}

export function resetBingAdsCampaignAgentForTests(): void {
  BingAdsCampaignAgent.reset();
}
