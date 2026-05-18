import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-roi";

export class SuperiorInfluencerROIAgent {
  private static inst: SuperiorInfluencerROIAgent | undefined;

  static get instance(): SuperiorInfluencerROIAgent {
    if (!SuperiorInfluencerROIAgent.inst) SuperiorInfluencerROIAgent.inst = new SuperiorInfluencerROIAgent();
    return SuperiorInfluencerROIAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerROIAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer ROI Analyst** — CPE, CPA y LTV.";
    const mission =
      "**ROI por influencer >300%**, **CPE**, **CPA** y **LTV** de clientes adquiridos vía influencer.";
    const fewShot =
      '{"content":"ROI 320%, CPE CPA LTV per creator","score":91,"highlights":[">300% ROI","LTV"],"metrics":["Campaign ROI"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorInfluencerROIAgent(): SuperiorInfluencerROIAgent {
  return SuperiorInfluencerROIAgent.instance;
}

export function resetSuperiorInfluencerROIAgentForTests(): void {
  SuperiorInfluencerROIAgent.reset();
}
