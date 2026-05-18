import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-access";

export class MembershipPortalAccessAgent {
  private static inst: MembershipPortalAccessAgent | undefined;

  static get instance(): MembershipPortalAccessAgent {
    if (!MembershipPortalAccessAgent.inst) MembershipPortalAccessAgent.inst = new MembershipPortalAccessAgent();
    return MembershipPortalAccessAgent.inst;
  }

  static reset(): void {
    MembershipPortalAccessAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Access** — control de acceso por membresía.";
    const mission =
      "Gestiona **tiers de membresía**, **contenido exclusivo** y **permisos por nivel** con **multi-tier ilimitados**.";
    const fewShot =
      '{"content":"Access: tiers, contenido exclusivo, permisos por nivel, multi-tier","score":92,"highlights":["Multi-tier","Permisos"],"metrics":["Tier coverage"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getMembershipPortalAccessAgent(): MembershipPortalAccessAgent {
  return MembershipPortalAccessAgent.instance;
}

export function resetMembershipPortalAccessAgentForTests(): void {
  MembershipPortalAccessAgent.reset();
}
