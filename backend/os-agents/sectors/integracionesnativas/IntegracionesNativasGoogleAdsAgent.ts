import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-googleads";

export class IntegracionesNativasGoogleAdsAgent {
  private static inst: IntegracionesNativasGoogleAdsAgent | undefined;

  static get instance(): IntegracionesNativasGoogleAdsAgent {
    if (!IntegracionesNativasGoogleAdsAgent.inst)
      IntegracionesNativasGoogleAdsAgent.inst = new IntegracionesNativasGoogleAdsAgent();
    return IntegracionesNativasGoogleAdsAgent.inst;
  }

  static reset(): void {
    IntegracionesNativasGoogleAdsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas Google Ads** — integración nativa con Google Ads.";
    const mission =
      "Sincroniza **conversiones**, **remarketing**, **smart bidding** y **Performance Max**; ROAS unificado en tiempo real.";
    const fewShot =
      '{"content":"Google Ads: conversiones, remarketing, smart bidding, Performance Max","score":91,"highlights":["Smart bidding","PMax"],"metrics":["Google Ads ROAS"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getIntegracionesNativasGoogleAdsAgent(): IntegracionesNativasGoogleAdsAgent {
  return IntegracionesNativasGoogleAdsAgent.instance;
}

export function resetIntegracionesNativasGoogleAdsAgentForTests(): void {
  IntegracionesNativasGoogleAdsAgent.reset();
}
