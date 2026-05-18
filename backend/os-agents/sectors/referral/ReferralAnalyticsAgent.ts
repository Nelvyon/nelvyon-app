import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-analytics";

export class ReferralAnalyticsAgent {
  private static inst: ReferralAnalyticsAgent | undefined;

  static get instance(): ReferralAnalyticsAgent {
    if (!ReferralAnalyticsAgent.inst) ReferralAnalyticsAgent.inst = new ReferralAnalyticsAgent();
    return ReferralAnalyticsAgent.inst;
  }

  static reset(): void {
    ReferralAnalyticsAgent.inst = undefined;
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
        eliteRole: "ROLE: Growth quant top 1%; k-factor y cohortes sin inflar.",
        mission:
          "Métricas: k-factor viral, LTV por canal referral vs orgánico, payback del crédito 30%; hipótesis solo si datos en brief.",
        fewShotExample:
          '{"content":"k = invites×conversion×activation; LTV referral vs baseline.","score":91,"highlights":["Definición k por cohorte semanal","LTV 12m ponderado"],"metrics":["k=0.42 ejemplo","CAC referral vs paid ads"]}',
      },
      input,
      0.1,
    );
  }
}

export function getReferralAnalyticsAgent(): ReferralAnalyticsAgent {
  return ReferralAnalyticsAgent.instance;
}

export function resetReferralAnalyticsAgentForTests(): void {
  ReferralAnalyticsAgent.reset();
}
