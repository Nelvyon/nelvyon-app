import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-onboarding";

export class MembershipPortalOnboardingAgent {
  private static inst: MembershipPortalOnboardingAgent | undefined;

  static get instance(): MembershipPortalOnboardingAgent {
    if (!MembershipPortalOnboardingAgent.inst) MembershipPortalOnboardingAgent.inst = new MembershipPortalOnboardingAgent();
    return MembershipPortalOnboardingAgent.inst;
  }

  static reset(): void {
    MembershipPortalOnboardingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Onboarding** — onboarding de nuevos miembros.";
    const mission =
      "Automatiza **bienvenida**, **tour guiado** y **primeros pasos**; completion rate **>80%**.";
    const fewShot =
      '{"content":"Onboarding: bienvenida auto, tour guiado, primeros pasos, >80% completion","score":87,"highlights":[">80% completion","Tour"],"metrics":["Onboarding completion"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getMembershipPortalOnboardingAgent(): MembershipPortalOnboardingAgent {
  return MembershipPortalOnboardingAgent.instance;
}

export function resetMembershipPortalOnboardingAgentForTests(): void {
  MembershipPortalOnboardingAgent.reset();
}
