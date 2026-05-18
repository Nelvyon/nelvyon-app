import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-report";

export class MembershipPortalReportAgent {
  private static inst: MembershipPortalReportAgent | undefined;

  static get instance(): MembershipPortalReportAgent {
    if (!MembershipPortalReportAgent.inst) MembershipPortalReportAgent.inst = new MembershipPortalReportAgent();
    return MembershipPortalReportAgent.inst;
  }

  static reset(): void {
    MembershipPortalReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Report** — informes ejecutivos del portal.";
    const mission =
      "Genera informes de **crecimiento de miembros**, **revenue por tier** y **retención**.";
    const fewShot =
      '{"content":"Report: crecimiento miembros, revenue por tier, retención","score":86,"highlights":["Por tier","Retención"],"metrics":["Member growth"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getMembershipPortalReportAgent(): MembershipPortalReportAgent {
  return MembershipPortalReportAgent.instance;
}

export function resetMembershipPortalReportAgentForTests(): void {
  MembershipPortalReportAgent.reset();
}
