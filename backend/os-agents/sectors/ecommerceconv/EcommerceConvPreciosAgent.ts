import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-precios";

let inst: EcommerceConvPreciosAgent | null = null;

export class EcommerceConvPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvPreciosAgent {
    if (!inst) inst = new EcommerceConvPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Precios** — demanda con guardrails.";
    const mission =
      "Define **precios dinámicos por demanda** (señales inventario/seasonality, límites, transparencia, compliance placeholder).";
    const fewShot =
      '{"result":"Política pricing dinámico","score":85,"recommendations":["Floor price","Log experimentos","Mensaje honesto al usuario"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvPreciosAgent(): EcommerceConvPreciosAgent {
  return EcommerceConvPreciosAgent.instance();
}

export function resetEcommerceConvPreciosAgentForTests(): void {
  inst = null;
}
