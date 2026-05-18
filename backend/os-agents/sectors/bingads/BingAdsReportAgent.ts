import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-report";

export class BingAdsReportAgent {
  private static inst: BingAdsReportAgent | undefined;

  static get instance(): BingAdsReportAgent {
    if (!BingAdsReportAgent.inst) BingAdsReportAgent.inst = new BingAdsReportAgent();
    return BingAdsReportAgent.inst;
  }

  static reset(): void {
    BingAdsReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **Reporting Analyst Microsoft Ads** — informes: **impresiones, clicks, conversiones, ROAS, Quality Score** por campaña y grupo.";
    const mission =
      "Construye **informe ejecutivo**: cohortes, breakdown Search vs Shopping, tendencia CPA/ROAS vs objetivos, degradación de QS y acciones.";
    const fewShot =
      '{"content":"Weekly Bing — conv + ROAS + QS by ad group","score":90,"highlights":["QS drill-down"],"metrics":["CTR trend"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBingAdsReportAgent(): BingAdsReportAgent {
  return BingAdsReportAgent.instance;
}

export function resetBingAdsReportAgentForTests(): void {
  BingAdsReportAgent.reset();
}
