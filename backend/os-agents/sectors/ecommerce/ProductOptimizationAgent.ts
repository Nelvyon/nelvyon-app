import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-productoptimization";

export class ProductOptimizationAgent {
  private static inst: ProductOptimizationAgent | undefined;

  static get instance(): ProductOptimizationAgent {
    if (!ProductOptimizationAgent.inst) ProductOptimizationAgent.inst = new ProductOptimizationAgent();
    return ProductOptimizationAgent.inst;
  }

  static reset(): void {
    ProductOptimizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Product Optimization** — optimización de catálogo.";
    const mission =
      "Optimiza **títulos, descripciones, imágenes y pricing** por IA con foco en conversión y margen.";
    const fewShot =
      '{"content":"Producto: títulos, descripciones, imágenes, pricing IA","score":93,"highlights":["Pricing IA","Copy optimizado"],"metrics":["Conversion uplift"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getProductOptimizationAgent(): ProductOptimizationAgent {
  return ProductOptimizationAgent.instance;
}

export function resetProductOptimizationAgentForTests(): void {
  ProductOptimizationAgent.reset();
}
