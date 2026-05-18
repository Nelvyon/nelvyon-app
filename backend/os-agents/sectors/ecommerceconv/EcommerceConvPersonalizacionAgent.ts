import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-personalizacion";

let inst: EcommerceConvPersonalizacionAgent | null = null;

export class EcommerceConvPersonalizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvPersonalizacionAgent {
    if (!inst) inst = new EcommerceConvPersonalizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Personalización** — RT sin creepiness.";
    const mission =
      "Define **personalización por comportamiento** en tiempo real (señales, cohortes, reglas, consentimiento y opt-out).";
    const fewShot =
      '{"result":"Blueprint RT personalization","score":87,"recommendations":["Feature flags","Cap frecuencia","PII minimization"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvPersonalizacionAgent(): EcommerceConvPersonalizacionAgent {
  return EcommerceConvPersonalizacionAgent.instance();
}

export function resetEcommerceConvPersonalizacionAgentForTests(): void {
  inst = null;
}
