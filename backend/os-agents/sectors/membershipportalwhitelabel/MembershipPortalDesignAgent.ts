import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-design";

export class MembershipPortalDesignAgent {
  private static inst: MembershipPortalDesignAgent | undefined;

  static get instance(): MembershipPortalDesignAgent {
    if (!MembershipPortalDesignAgent.inst) MembershipPortalDesignAgent.inst = new MembershipPortalDesignAgent();
    return MembershipPortalDesignAgent.inst;
  }

  static reset(): void {
    MembershipPortalDesignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Design** — diseño portal white-label.";
    const mission =
      "Define **branding cliente**, **temas**, **colores** y **logo** con personalización **100%** sin mencionar NELVYON.";
    const fewShot =
      '{"content":"Design: branding, temas, colores, logo, 100% white-label","score":93,"highlights":["100% brand","No NELVYON"],"metrics":["Brand consistency"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getMembershipPortalDesignAgent(): MembershipPortalDesignAgent {
  return MembershipPortalDesignAgent.instance;
}

export function resetMembershipPortalDesignAgentForTests(): void {
  MembershipPortalDesignAgent.reset();
}
