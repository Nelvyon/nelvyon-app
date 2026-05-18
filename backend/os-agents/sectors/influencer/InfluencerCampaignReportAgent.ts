import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-campaign-report";

export class InfluencerCampaignReportAgent {
  private static inst: InfluencerCampaignReportAgent | undefined;

  static get instance(): InfluencerCampaignReportAgent {
    if (!InfluencerCampaignReportAgent.inst) InfluencerCampaignReportAgent.inst = new InfluencerCampaignReportAgent();
    return InfluencerCampaignReportAgent.inst;
  }

  static reset(): void {
    InfluencerCampaignReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerReachLlm();
  }

  async run(input: InfluencerReachInput): Promise<InfluencerReachOutput> {
    return runInfluencerReachAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Reporting ejecutivo top 1%; sintetizas KPIs, narrativa de negocio y próximos experimentos.",
        mission:
          "Genera informe post-campaña: resumen, KPIs vs objetivo, aprendizajes, creators ganadores/perdedores, siguiente hipótesis.",
        fewShotExample: `Input: campaña cerrada con métricas proxy engagement y ventas atribuidas soft.
Output JSON: informe en secciones; score 87; recommendations sobre incrementality test próximo sprint.`,
      },
      input,
    );
  }
}

export function getInfluencerCampaignReportAgent(): InfluencerCampaignReportAgent {
  return InfluencerCampaignReportAgent.instance;
}

export function resetInfluencerCampaignReportAgentForTests(): void {
  InfluencerCampaignReportAgent.reset();
}
