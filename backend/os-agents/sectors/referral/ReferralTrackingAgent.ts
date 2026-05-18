import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-tracking";

export class ReferralTrackingAgent {
  private static inst: ReferralTrackingAgent | undefined;

  static get instance(): ReferralTrackingAgent {
    if (!ReferralTrackingAgent.inst) ReferralTrackingAgent.inst = new ReferralTrackingAgent();
    return ReferralTrackingAgent.inst;
  }

  static reset(): void {
    ReferralTrackingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReferralLlm();
  }

  async run(input: ReferralInput): Promise<ReferralOutput> {
    return runReferralAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Attribution analyst top 1%; funnel referral sin cookies ilegales.",
        mission:
          "Define tracking de clicks → signup → primer pago; IDs de correlación y campos en referral_codes (clicks, conversiones).",
        fewShotExample:
          '{"content":"Cadena UTM + código en query; server-side join por user_id.","score":90,"highlights":["click_id en primera visita","conversion al invoice paid"],"metrics":["CTR enlace","Registro/click","Paid/registro"]}',
      },
      input,
      0.1,
    );
  }
}

export function getReferralTrackingAgent(): ReferralTrackingAgent {
  return ReferralTrackingAgent.instance;
}

export function resetReferralTrackingAgentForTests(): void {
  ReferralTrackingAgent.reset();
}
