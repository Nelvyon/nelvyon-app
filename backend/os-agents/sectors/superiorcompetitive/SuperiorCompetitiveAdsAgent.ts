import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-ads";

export class SuperiorCompetitiveAdsAgent {
  private static inst: SuperiorCompetitiveAdsAgent | undefined;

  static get instance(): SuperiorCompetitiveAdsAgent {
    if (!SuperiorCompetitiveAdsAgent.inst) SuperiorCompetitiveAdsAgent.inst = new SuperiorCompetitiveAdsAgent();
    return SuperiorCompetitiveAdsAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitiveAdsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Ads** — monitoreo de anuncios rivales.";
    const mission =
      "Monitorea **anuncios Meta/Google/TikTok** de competidores: creatividades, mensajes y lanzamientos de campaña.";
    const fewShot =
      '{"content":"Meta Google TikTok ad monitoring, creatives and messaging","score":85,"highlights":["Ad creatives","New campaigns"],"metrics":["Ad change SLA"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorCompetitiveAdsAgent(): SuperiorCompetitiveAdsAgent {
  return SuperiorCompetitiveAdsAgent.instance;
}

export function resetSuperiorCompetitiveAdsAgentForTests(): void {
  SuperiorCompetitiveAdsAgent.reset();
}
