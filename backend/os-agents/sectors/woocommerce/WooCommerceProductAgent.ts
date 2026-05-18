import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-product";

export class WooCommerceProductAgent {
  private static inst: WooCommerceProductAgent | undefined;

  static get instance(): WooCommerceProductAgent {
    if (!WooCommerceProductAgent.inst) WooCommerceProductAgent.inst = new WooCommerceProductAgent();
    return WooCommerceProductAgent.inst;
  }

  static reset(): void {
    WooCommerceProductAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWooCommerceLlm();
  }

  async run(input: WooCommerceInput): Promise<WooCommerceOutput> {
    return runWooCommerceAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Catalog sync + enrichment sin romper SKUs.",
        mission:
          "Sincroniza y optimiza **fichas de producto** vía API: títulos, descripciones cortas/largas, atributos, imágenes orientativas; detecta huecos SEO.",
        fewShotExample:
          '{"content":"Bulk update 120 SKUs; gaps imagen 3%.","score":89,"highlights":["REST batch","Categories"],"metrics":["sync_ok"]}',
      },
      input,
      0.4,
    );
  }
}

export function getWooCommerceProductAgent(): WooCommerceProductAgent {
  return WooCommerceProductAgent.instance;
}

export function resetWooCommerceProductAgentForTests(): void {
  WooCommerceProductAgent.reset();
}
