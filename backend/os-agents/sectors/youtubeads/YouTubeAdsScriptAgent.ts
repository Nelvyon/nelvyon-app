import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-script";

export class YouTubeAdsScriptAgent {
  private static inst: YouTubeAdsScriptAgent | undefined;

  static get instance(): YouTubeAdsScriptAgent {
    if (!YouTubeAdsScriptAgent.inst) YouTubeAdsScriptAgent.inst = new YouTubeAdsScriptAgent();
    return YouTubeAdsScriptAgent.inst;
  }

  static reset(): void {
    YouTubeAdsScriptAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **YouTube Scriptwriter** — guiones **15s / 30s / 60s** con **gancho en 0–5s obligatorio** y estructura **Gancho → Problema → Solución → CTA**.";
    const mission =
      "Produce **tres variantes de guion** por duración; marca beats por segundo; supers/on-screen text; voz y tono por sector (software B2B, educación, fitness, finanzas, ecommerce); cumplimiento TrueView/Bumper/In-Feed.";
    const fewShot =
      '{"content":"15s bumper: gancho 0-2s + CTA final","score":92,"highlights":["Hook <5s","Problema→CTA"],"metrics":["Duración beats"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getYouTubeAdsScriptAgent(): YouTubeAdsScriptAgent {
  return YouTubeAdsScriptAgent.instance;
}

export function resetYouTubeAdsScriptAgentForTests(): void {
  YouTubeAdsScriptAgent.reset();
}
