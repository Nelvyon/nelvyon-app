import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-ecommercepersonalization";

export class EcommercePersonalizationAgent {
  private static inst: EcommercePersonalizationAgent | undefined;

  static get instance(): EcommercePersonalizationAgent {
    if (!EcommercePersonalizationAgent.inst) EcommercePersonalizationAgent.inst = new EcommercePersonalizationAgent();
    return EcommercePersonalizationAgent.inst;
  }

  static reset(): void {
    EcommercePersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Ecommerce Personalization** — recomendaciones 1:1.";
    const mission =
      "Entrega **recomendaciones producto 1:1** con **upsell/cross-sell automático** y **accuracy >85%**.";
    const fewShot =
      '{"content":"Personalización: 1:1, upsell/cross-sell, >85% accuracy","score":94,"highlights":[">85% accuracy","Upsell auto"],"metrics":["Recommendation accuracy"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getEcommercePersonalizationAgent(): EcommercePersonalizationAgent {
  return EcommercePersonalizationAgent.instance;
}

export function resetEcommercePersonalizationAgentForTests(): void {
  EcommercePersonalizationAgent.reset();
}
