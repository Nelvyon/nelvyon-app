import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-email";

export class ReferralEmailAgent {
  private static inst: ReferralEmailAgent | undefined;

  static get instance(): ReferralEmailAgent {
    if (!ReferralEmailAgent.inst) ReferralEmailAgent.inst = new ReferralEmailAgent();
    return ReferralEmailAgent.inst;
  }

  static reset(): void {
    ReferralEmailAgent.inst = undefined;
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
        eliteRole: "ROLE: Lifecycle copy chief top 1%; invitaciones que convierten sin spam.",
        mission:
          "Redacta emails de invitación personalizados con beneficio claro (mes gratis), CTA y línea de asunto A/B.",
        fewShotExample:
          '{"content":"Asunto A/B + cuerpo corto + enlace con código; unsubscribe visible.","score":89,"highlights":["Invita con NLV-ABC123","Tu amigo gana 30% del primer pago"],"metrics":["CTA único","Preview texto <90 chars"]}',
      },
      input,
      0.7,
    );
  }
}

export function getReferralEmailAgent(): ReferralEmailAgent {
  return ReferralEmailAgent.instance;
}

export function resetReferralEmailAgentForTests(): void {
  ReferralEmailAgent.reset();
}
