import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-ecommerceanalytics";

export class EcommerceAnalyticsAgent {
  private static inst: EcommerceAnalyticsAgent | undefined;

  static get instance(): EcommerceAnalyticsAgent {
    if (!EcommerceAnalyticsAgent.inst) EcommerceAnalyticsAgent.inst = new EcommerceAnalyticsAgent();
    return EcommerceAnalyticsAgent.inst;
  }

  static reset(): void {
    EcommerceAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Ecommerce Analytics** — LTV y cohortes.";
    const mission =
      "Analiza **LTV, AOV, repeat purchase rate** y **cohortes compradores** con **LTV +>30%** en 90 días.";
    const fewShot =
      '{"content":"Analytics: LTV, AOV, repeat rate, cohortes, +>30% LTV 90d","score":94,"highlights":["+>30% LTV","Cohortes"],"metrics":["LTV 90d"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getEcommerceAnalyticsAgent(): EcommerceAnalyticsAgent {
  return EcommerceAnalyticsAgent.instance;
}

export function resetEcommerceAnalyticsAgentForTests(): void {
  EcommerceAnalyticsAgent.reset();
}
