import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-campaign";

export class SuperiorInfluencerCampaignAgent {
  private static inst: SuperiorInfluencerCampaignAgent | undefined;

  static get instance(): SuperiorInfluencerCampaignAgent {
    if (!SuperiorInfluencerCampaignAgent.inst) SuperiorInfluencerCampaignAgent.inst = new SuperiorInfluencerCampaignAgent();
    return SuperiorInfluencerCampaignAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerCampaignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer Campaign Manager** — briefing y aprobaciones.";
    const mission =
      "Gestiona campañas: **briefing creativo <2 min**, deadlines y aprobaciones por influencer.";
    const fewShot =
      '{"content":"Creative brief <2m, deadlines, approval workflow","score":90,"highlights":["<2 min brief","Approvals"],"metrics":["Campaign status"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorInfluencerCampaignAgent(): SuperiorInfluencerCampaignAgent {
  return SuperiorInfluencerCampaignAgent.instance;
}

export function resetSuperiorInfluencerCampaignAgentForTests(): void {
  SuperiorInfluencerCampaignAgent.reset();
}
