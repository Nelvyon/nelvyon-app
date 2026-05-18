import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-community";

export class MembershipPortalCommunityAgent {
  private static inst: MembershipPortalCommunityAgent | undefined;

  static get instance(): MembershipPortalCommunityAgent {
    if (!MembershipPortalCommunityAgent.inst) MembershipPortalCommunityAgent.inst = new MembershipPortalCommunityAgent();
    return MembershipPortalCommunityAgent.inst;
  }

  static reset(): void {
    MembershipPortalCommunityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Community** — comunidad de miembros.";
    const mission =
      "Activa **foros**, **grupos**, **eventos privados** y **networking** entre miembros por tier.";
    const fewShot =
      '{"content":"Community: foros, grupos, eventos privados, networking","score":90,"highlights":["Foros","Eventos"],"metrics":["Community engagement"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getMembershipPortalCommunityAgent(): MembershipPortalCommunityAgent {
  return MembershipPortalCommunityAgent.instance;
}

export function resetMembershipPortalCommunityAgentForTests(): void {
  MembershipPortalCommunityAgent.reset();
}
