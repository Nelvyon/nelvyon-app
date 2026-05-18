import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-abandoned-cart";

export class WooCommerceAbandonedCartAgent {
  private static inst: WooCommerceAbandonedCartAgent | undefined;

  static get instance(): WooCommerceAbandonedCartAgent {
    if (!WooCommerceAbandonedCartAgent.inst) WooCommerceAbandonedCartAgent.inst = new WooCommerceAbandonedCartAgent();
    return WooCommerceAbandonedCartAgent.inst;
  }

  static reset(): void {
    WooCommerceAbandonedCartAgent.inst = undefined;
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
        eliteRole: "ROLE: Cart recovery automation; cupones únicos.",
        mission:
          "Detecta **carritos abandonados** y lanza secuencia **3 emails** (**1h**, **24h**, **72h**) con descuento progresivo **5%**, **10%**, **15%**.",
        fewShotExample:
          '{"content":"T72 cupón 15% single-use ABANDON72.","score":90,"highlights":["Segment cart value","Cap margin"],"metrics":["Recovered €"]}',
      },
      input,
      0.2,
    );
  }
}

export function getWooCommerceAbandonedCartAgent(): WooCommerceAbandonedCartAgent {
  return WooCommerceAbandonedCartAgent.instance;
}

export function resetWooCommerceAbandonedCartAgentForTests(): void {
  WooCommerceAbandonedCartAgent.reset();
}
