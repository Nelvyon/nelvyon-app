import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-campaign";

export class ReferralCampaignAgent {
  private static inst: ReferralCampaignAgent | undefined;

  static get instance(): ReferralCampaignAgent {
    if (!ReferralCampaignAgent.inst) ReferralCampaignAgent.inst = new ReferralCampaignAgent();
    return ReferralCampaignAgent.inst;
  }

  static reset(): void {
    ReferralCampaignAgent.inst = undefined;
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
        eliteRole: "ROLE: Promo strategist top 1%; doble recompensa sin romper unit economics.",
        mission:
          "Diseña campaña especial (ej. doble crédito 48h): ventana, mensajes, límites por usuario y salvaguardas anti-fraude.",
        fewShotExample:
          '{"content":"Black Friday: 2× crédito referidor tope 200€; mismo gate fraude.","score":86,"highlights":["Ventana UTC explícita","Banner in-app + email"],"metrics":["Presupuesto créditos máx","Cap referidos por día"]}',
      },
      input,
      0.5,
    );
  }
}

export function getReferralCampaignAgent(): ReferralCampaignAgent {
  return ReferralCampaignAgent.instance;
}

export function resetReferralCampaignAgentForTests(): void {
  ReferralCampaignAgent.reset();
}
