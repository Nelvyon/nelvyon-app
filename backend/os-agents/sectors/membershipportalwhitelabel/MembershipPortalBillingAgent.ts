import type { ILlmClient } from "../../LlmClient";
import type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
import { getDefaultMembershipPortalWhiteLabelLlm, runMembershipPortalWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "membershipportalwhitelabel-billing";

export class MembershipPortalBillingAgent {
  private static inst: MembershipPortalBillingAgent | undefined;

  static get instance(): MembershipPortalBillingAgent {
    if (!MembershipPortalBillingAgent.inst) MembershipPortalBillingAgent.inst = new MembershipPortalBillingAgent();
    return MembershipPortalBillingAgent.inst;
  }

  static reset(): void {
    MembershipPortalBillingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembershipPortalWhiteLabelLlm();
  }

  async run(input: MembershipPortalWhiteLabelInput): Promise<MembershipPortalWhiteLabelOutput> {
    const eliteRole = "Eres **MembershipPortal Billing** — facturación de membresías con Paddle.";
    const mission =
      "Orquesta **suscripciones**, **upgrades**, **downgrades** y **pausas** con **pagos automáticos Paddle**.";
    const fewShot =
      '{"content":"Billing: suscripciones, upgrades, downgrades, pausas Paddle","score":91,"highlights":["Paddle auto","Up/downgrade"],"metrics":["MRR"]}';
    return runMembershipPortalWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getMembershipPortalBillingAgent(): MembershipPortalBillingAgent {
  return MembershipPortalBillingAgent.instance;
}

export function resetMembershipPortalBillingAgentForTests(): void {
  MembershipPortalBillingAgent.reset();
}
