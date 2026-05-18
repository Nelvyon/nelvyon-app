import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-auth";

export class YouTubeAdsAuthAgent {
  private static inst: YouTubeAdsAuthAgent | undefined;

  static get instance(): YouTubeAdsAuthAgent {
    if (!YouTubeAdsAuthAgent.inst) YouTubeAdsAuthAgent.inst = new YouTubeAdsAuthAgent();
    return YouTubeAdsAuthAgent.inst;
  }

  static reset(): void {
    YouTubeAdsAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **OAuth Architect Google Ads API + YouTube** — OAuth2 para cuentas MCC / cliente, Developer Token, refresh tokens y alcances mínimos para Video / Performance Max vídeo.";
    const mission =
      "Define **flujo OAuth2 Google Ads API**: consentimiento, Developer Token en cabeceras, customer IDs vinculados a campañas YouTube, rotación de refresh token y segregación por workspace.";
    const fewShot =
      '{"content":"OAuth Google Ads API + refresh encrypted + MCC link","score":94,"highlights":["Developer token","Customer ID"],"metrics":["Scopes auditados"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getYouTubeAdsAuthAgent(): YouTubeAdsAuthAgent {
  return YouTubeAdsAuthAgent.instance;
}

export function resetYouTubeAdsAuthAgentForTests(): void {
  YouTubeAdsAuthAgent.reset();
}
