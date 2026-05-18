import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-email";

export class WooCommerceEmailAgent {
  private static inst: WooCommerceEmailAgent | undefined;

  static get instance(): WooCommerceEmailAgent {
    if (!WooCommerceEmailAgent.inst) WooCommerceEmailAgent.inst = new WooCommerceEmailAgent();
    return WooCommerceEmailAgent.inst;
  }

  static reset(): void {
    WooCommerceEmailAgent.inst = undefined;
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
        eliteRole: "ROLE: Lifecycle email composer; WC hooks aware.",
        mission:
          "Genera **emails transaccionales** y **campañas segmentadas** por comportamiento (carrito, compra, VIP, inactivo); coherencia marca y compliance básico.",
        fewShotExample:
          '{"content":"Flow VIP early-access + dynamic blocks productos vistos.","score":88,"highlights":["UTM","Preheader"],"metrics":["Open/click"]}',
      },
      input,
      0.7,
    );
  }
}

export function getWooCommerceEmailAgent(): WooCommerceEmailAgent {
  return WooCommerceEmailAgent.instance;
}

export function resetWooCommerceEmailAgentForTests(): void {
  WooCommerceEmailAgent.reset();
}
