import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-upsell";

let inst: EcommerceConvUpsellAgent | null = null;

export class EcommerceConvUpsellAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvUpsellAgent {
    if (!inst) inst = new EcommerceConvUpsellAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Upsell** — revenue lift sin degradar UX.";
    const mission =
      "Orquesta **upsell / cross-sell IA** (PDP, carrito, post-add: bundles, compatibilidad, límites de intrusión).";
    const fewShot =
      '{"result":"Matriz upsell por categoría","score":90,"recommendations":["Bundle compatible","Post-add 1 clic","Kill switch por bounce"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvUpsellAgent(): EcommerceConvUpsellAgent {
  return EcommerceConvUpsellAgent.instance();
}

export function resetEcommerceConvUpsellAgentForTests(): void {
  inst = null;
}
