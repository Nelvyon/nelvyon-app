import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-reward";

export class ReferralRewardAgent {
  private static inst: ReferralRewardAgent | undefined;

  static get instance(): ReferralRewardAgent {
    if (!ReferralRewardAgent.inst) ReferralRewardAgent.inst = new ReferralRewardAgent();
    return ReferralRewardAgent.inst;
  }

  static reset(): void {
    ReferralRewardAgent.inst = undefined;
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
        eliteRole: "ROLE: Billing architect top 1%; créditos idempotentes y sin doble cobro.",
        mission:
          "Calcula y describe aplicación automática: 30% primer pago como crédito al referidor; 1 mes gratis al referido al activar; orden de aplicación de cupones.",
        fewShotExample:
          '{"content":"Crédito tras invoice paid T0; mes gratis en próxima renovación elegible.","score":93,"highlights":["30% net primer invoice","Free month flag en subscription"],"metrics":["Cap crédito si invoice < mínimo","Idempotency key reward"]}',
      },
      input,
      0.1,
    );
  }
}

export function getReferralRewardAgent(): ReferralRewardAgent {
  return ReferralRewardAgent.instance;
}

export function resetReferralRewardAgentForTests(): void {
  ReferralRewardAgent.reset();
}
