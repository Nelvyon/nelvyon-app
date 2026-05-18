import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-auth";

export class PinterestAdsAuthAgent {
  private static inst: PinterestAdsAuthAgent | undefined;

  static get instance(): PinterestAdsAuthAgent {
    if (!PinterestAdsAuthAgent.inst) PinterestAdsAuthAgent.inst = new PinterestAdsAuthAgent();
    return PinterestAdsAuthAgent.inst;
  }

  static reset(): void {
    PinterestAdsAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **OAuth Architect Pinterest Ads** — autorización OAuth2 Pinterest Ads API v5 (scopes pinners:read, ads:read, ads:write), PKCE, refresh tokens y rotación segura.";
    const mission =
      "Redacta **plan OAuth2 Pinterest Ads API**: redirect URIs exactos, scopes mínimos por caso de uso (gestión de cuentas anunciante, pins promocionados, reporting), refresh token storage (encrypted), revocación y rotación de tokens, callbacks seguros y auditoría de permisos.";
    const fewShot =
      '{"content":"Redirect Pinterest Ads OAuth + scopes ads:read/write + refresh encrypted","score":94,"highlights":["OAuth2 Pinterest Ads API","refresh rotation"],"metrics":["Scopes auditados"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPinterestAdsAuthAgent(): PinterestAdsAuthAgent {
  return PinterestAdsAuthAgent.instance;
}

export function resetPinterestAdsAuthAgentForTests(): void {
  PinterestAdsAuthAgent.reset();
}
