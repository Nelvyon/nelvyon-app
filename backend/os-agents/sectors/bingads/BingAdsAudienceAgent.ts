import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-audience";

export class BingAdsAudienceAgent {
  private static inst: BingAdsAudienceAgent | undefined;

  static get instance(): BingAdsAudienceAgent {
    if (!BingAdsAudienceAgent.inst) BingAdsAudienceAgent.inst = new BingAdsAudienceAgent();
    return BingAdsAudienceAgent.inst;
  }

  static reset(): void {
    BingAdsAudienceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **Audience Strategist Microsoft Ads** — **LinkedIn Profile Targeting** (cargo, empresa, industria), **remarketing**, **in-market**.";
    const mission =
      "Define **estructura de audiencias**: combinaciones LinkedIn + intención; listas remarketing; in-market por vertical (finanzas, legal, salud, seguros, B2B); exclusiones y solapamiento.";
    const fewShot =
      '{"content":"LinkedIn job title + finance in-market stack","score":92,"highlights":["LinkedIn unique","Remarketing"],"metrics":["Audience layering"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBingAdsAudienceAgent(): BingAdsAudienceAgent {
  return BingAdsAudienceAgent.instance;
}

export function resetBingAdsAudienceAgentForTests(): void {
  BingAdsAudienceAgent.reset();
}
