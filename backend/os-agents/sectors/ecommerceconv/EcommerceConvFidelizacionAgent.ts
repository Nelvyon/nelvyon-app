import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-fidelizacion";

let inst: EcommerceConvFidelizacionAgent | null = null;

export class EcommerceConvFidelizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvFidelizacionAgent {
    if (!inst) inst = new EcommerceConvFidelizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Fidelización** — LTV sin canibalizar margen.";
    const mission =
      "Diseña **programa de fidelización automático** (puntos, tiers, comunicaciones, anti-churn suave).";
    const fewShot =
      '{"result":"Programa loyalty v1","score":88,"recommendations":["Tier claro","Reward no-cash primero","Win-back 90d"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvFidelizacionAgent(): EcommerceConvFidelizacionAgent {
  return EcommerceConvFidelizacionAgent.instance();
}

export function resetEcommerceConvFidelizacionAgentForTests(): void {
  inst = null;
}
