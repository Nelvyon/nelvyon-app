import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-report";

export class PinterestAdsReportAgent {
  private static inst: PinterestAdsReportAgent | undefined;

  static get instance(): PinterestAdsReportAgent {
    if (!PinterestAdsReportAgent.inst) PinterestAdsReportAgent.inst = new PinterestAdsReportAgent();
    return PinterestAdsReportAgent.inst;
  }

  static reset(): void {
    PinterestAdsReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **Reporting Analyst Pinterest Ads** — informes de rendimiento: **impresiones, clicks, ROAS**, por campaña y Pin.";
    const mission =
      "Construye **informe ejecutivo**: cohortes temporales, breakdown por vertical Pinterest; comparativa vs CPA y ROAS objetivo; insights accionables.";
    const fewShot =
      '{"content":"Weekly Pinterest Ads — ROAS por vertical moda/hogar","score":90,"highlights":["Impressions→ROAS"],"metrics":["CTR / CPA trend"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPinterestAdsReportAgent(): PinterestAdsReportAgent {
  return PinterestAdsReportAgent.instance;
}

export function resetPinterestAdsReportAgentForTests(): void {
  PinterestAdsReportAgent.reset();
}
