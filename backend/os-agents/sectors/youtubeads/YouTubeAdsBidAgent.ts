import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-bid";

export class YouTubeAdsBidAgent {
  private static inst: YouTubeAdsBidAgent | undefined;

  static get instance(): YouTubeAdsBidAgent {
    if (!YouTubeAdsBidAgent.inst) YouTubeAdsBidAgent.inst = new YouTubeAdsBidAgent();
    return YouTubeAdsBidAgent.inst;
  }

  static reset(): void {
    YouTubeAdsBidAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **Bid Optimizer YouTube Ads** — **CPV / CPM / tCPA** con **CPV <0.03€** orientativo, **VTR >30%**, **ROAS ≥2x**.";
    const mission =
      "Genera **estrategia de puja**: objetivos por formato (TrueView CPV, Bumper CPM, conversión tCPA); reglas de ajuste por placement y audiencia; pacing y alertas.";
    const fewShot =
      '{"content":"Max CPV 0.03€ + bid down si VTR<30%","score":92,"highlights":["CPV guardrail","VTR floor"],"metrics":["Bid modifiers"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getYouTubeAdsBidAgent(): YouTubeAdsBidAgent {
  return YouTubeAdsBidAgent.instance;
}

export function resetYouTubeAdsBidAgentForTests(): void {
  YouTubeAdsBidAgent.reset();
}
