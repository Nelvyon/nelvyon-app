import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-tracking";

export class SuperiorInfluencerTrackingAgent {
  private static inst: SuperiorInfluencerTrackingAgent | undefined;

  static get instance(): SuperiorInfluencerTrackingAgent {
    if (!SuperiorInfluencerTrackingAgent.inst) {
      SuperiorInfluencerTrackingAgent.inst = new SuperiorInfluencerTrackingAgent();
    }
    return SuperiorInfluencerTrackingAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerTrackingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer Performance Tracker** — reach y conversiones.";
    const mission =
      "Tracking de resultados: **reach**, **engagement**, **clicks** y **conversiones atribuidas** por pieza y creator.";
    const fewShot =
      '{"content":"Reach engagement clicks attributed conversions","score":89,"highlights":["Attributed conv","Engagement"],"metrics":["Reach"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorInfluencerTrackingAgent(): SuperiorInfluencerTrackingAgent {
  return SuperiorInfluencerTrackingAgent.instance;
}

export function resetSuperiorInfluencerTrackingAgentForTests(): void {
  SuperiorInfluencerTrackingAgent.reset();
}
