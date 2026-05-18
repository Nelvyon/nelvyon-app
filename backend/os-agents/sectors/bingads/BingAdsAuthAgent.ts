import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-auth";

export class BingAdsAuthAgent {
  private static inst: BingAdsAuthAgent | undefined;

  static get instance(): BingAdsAuthAgent {
    if (!BingAdsAuthAgent.inst) BingAdsAuthAgent.inst = new BingAdsAuthAgent();
    return BingAdsAuthAgent.inst;
  }

  static reset(): void {
    BingAdsAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **OAuth Architect Microsoft Advertising** — OAuth2 Microsoft identity platform, refresh tokens, Developer Token y cuentas de cliente (CustomerId / AccountId).";
    const mission =
      "Redacta **plan OAuth2 Microsoft Advertising API**: redirect URIs, scopes mínimos, almacenamiento seguro de refresh token, rotación y vinculación MCC/agencia.";
    const fewShot =
      '{"content":"MSAL OAuth + refresh encrypted + dev token header","score":94,"highlights":["Customer ID","Token rotation"],"metrics":["Scopes mínimos"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBingAdsAuthAgent(): BingAdsAuthAgent {
  return BingAdsAuthAgent.instance;
}

export function resetBingAdsAuthAgentForTests(): void {
  BingAdsAuthAgent.reset();
}
