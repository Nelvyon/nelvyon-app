import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-analytics";

export class MembershipPortalAnalyticsAgent {
  private static inst: MembershipPortalAnalyticsAgent | undefined;

  static get instance(): MembershipPortalAnalyticsAgent {
    if (!MembershipPortalAnalyticsAgent.inst) MembershipPortalAnalyticsAgent.inst = new MembershipPortalAnalyticsAgent();
    return MembershipPortalAnalyticsAgent.inst;
  }

  static reset(): void {
    MembershipPortalAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Analytics** — analytics del portal de membresías.";
    const mission =
      "Mide **MRR**, **churn**, **LTV por tier** y **engagement rate** con KPIs accionables.";
    const fewShot =
      '{"content":"Analytics: MRR, churn, LTV por tier, engagement rate","score":88,"highlights":["MRR","LTV tier"],"metrics":["Churn mensual"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getMembershipPortalAnalyticsAgent(): MembershipPortalAnalyticsAgent {
  return MembershipPortalAnalyticsAgent.instance;
}

export function resetMembershipPortalAnalyticsAgentForTests(): void {
  MembershipPortalAnalyticsAgent.reset();
}
