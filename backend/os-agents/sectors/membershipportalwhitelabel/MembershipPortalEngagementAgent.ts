import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-engagement";

export class MembershipPortalEngagementAgent {
  private static inst: MembershipPortalEngagementAgent | undefined;

  static get instance(): MembershipPortalEngagementAgent {
    if (!MembershipPortalEngagementAgent.inst) MembershipPortalEngagementAgent.inst = new MembershipPortalEngagementAgent();
    return MembershipPortalEngagementAgent.inst;
  }

  static reset(): void {
    MembershipPortalEngagementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Engagement** — engagement y gamificación.";
    const mission =
      "Impulsa **gamificación**, **puntos**, **badges** y **retos** para retención y churn **<5%** mensual.";
    const fewShot =
      '{"content":"Engagement: gamificación, puntos, badges, retos, churn <5%","score":89,"highlights":["Badges","Retos"],"metrics":["Engagement rate"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getMembershipPortalEngagementAgent(): MembershipPortalEngagementAgent {
  return MembershipPortalEngagementAgent.instance;
}

export function resetMembershipPortalEngagementAgentForTests(): void {
  MembershipPortalEngagementAgent.reset();
}
