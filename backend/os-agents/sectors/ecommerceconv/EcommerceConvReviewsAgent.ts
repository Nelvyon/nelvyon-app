import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-reviews";

let inst: EcommerceConvReviewsAgent | null = null;

export class EcommerceConvReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvReviewsAgent {
    if (!inst) inst = new EcommerceConvReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Reviews** — prueba social escalable.";
    const mission =
      "Automatiza **reviews** (solicitud post-compra, moderación, detección patrones fraude, syndication PDP).";
    const fewShot =
      '{"result":"Flujo reviews 14 días","score":86,"recommendations":["Double opt-in","Fotos opcionales","Responder plantillas"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvReviewsAgent(): EcommerceConvReviewsAgent {
  return EcommerceConvReviewsAgent.instance();
}

export function resetEcommerceConvReviewsAgentForTests(): void {
  inst = null;
}
