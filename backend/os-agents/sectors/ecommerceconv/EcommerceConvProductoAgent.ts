import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-producto";

let inst: EcommerceConvProductoAgent | null = null;

export class EcommerceConvProductoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvProductoAgent {
    if (!inst) inst = new EcommerceConvProductoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Producto** — PDP que convierte con IA.";
    const mission =
      "Genera **páginas de producto** (copy persuasivo, FAQs, specs; brief de imágenes IA; SEO + compliance marca).";
    const fewShot =
      '{"result":"Plantilla PDP v1","score":91,"recommendations":["Above fold USP","Schema Product","Disclaimer IA visual"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvProductoAgent(): EcommerceConvProductoAgent {
  return EcommerceConvProductoAgent.instance();
}

export function resetEcommerceConvProductoAgentForTests(): void {
  inst = null;
}
