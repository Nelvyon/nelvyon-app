import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-onboarding";

export class CommunityOnboardingAgent {
  private static inst: CommunityOnboardingAgent | undefined;

  static get instance(): CommunityOnboardingAgent {
    if (!CommunityOnboardingAgent.inst) CommunityOnboardingAgent.inst = new CommunityOnboardingAgent();
    return CommunityOnboardingAgent.inst;
  }

  static reset(): void {
    CommunityOnboardingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Onboarding** — bienvenida y activación de nuevos miembros.";
    const mission =
      "Diseña **bienvenida**, **activación** y **primer valor**; **primer engagement <5 min** y retención mes 1 **>80%**.";
    const fewShot =
      '{"content":"Onboarding: bienvenida, activación, primer valor, <5 min engagement","score":92,"highlights":["<5 min",">80% M1"],"metrics":["Time to first engagement"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getCommunityOnboardingAgent(): CommunityOnboardingAgent {
  return CommunityOnboardingAgent.instance;
}

export function resetCommunityOnboardingAgentForTests(): void {
  CommunityOnboardingAgent.reset();
}
