import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-report";

export class YouTubeAdsReportAgent {
  private static inst: YouTubeAdsReportAgent | undefined;

  static get instance(): YouTubeAdsReportAgent {
    if (!YouTubeAdsReportAgent.inst) YouTubeAdsReportAgent.inst = new YouTubeAdsReportAgent();
    return YouTubeAdsReportAgent.inst;
  }

  static reset(): void {
    YouTubeAdsReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **Reporting Analyst YouTube Ads** — informes de **views, VTR, CTR, conversiones, ROAS** por campaña y grupo.";
    const mission =
      "Construye **informe ejecutivo**: cohortes temporales, breakdown por formato (TrueView/Bumper/In-Feed); comparativa vs CPV, VTR y ROAS objetivo; insights accionables.";
    const fewShot =
      '{"content":"Weekly YouTube — views→conv ROAS 2x+","score":90,"highlights":["VTR vs target"],"metrics":["CTR / CPA trend"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getYouTubeAdsReportAgent(): YouTubeAdsReportAgent {
  return YouTubeAdsReportAgent.instance;
}

export function resetYouTubeAdsReportAgentForTests(): void {
  YouTubeAdsReportAgent.reset();
}
