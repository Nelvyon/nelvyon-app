import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-order";

export class WooCommerceOrderAgent {
  private static inst: WooCommerceOrderAgent | undefined;

  static get instance(): WooCommerceOrderAgent {
    if (!WooCommerceOrderAgent.inst) WooCommerceOrderAgent.inst = new WooCommerceOrderAgent();
    return WooCommerceOrderAgent.inst;
  }

  static reset(): void {
    WooCommerceOrderAgent.inst = undefined;
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
        eliteRole: "ROLE: Order-to-campaign bridge; estados WC.",
        mission:
          "Procesa **pedidos** y dispara **flujos post-compra**: confirmación, etiquetas segmento one_time/recurring/VIP, upsell relacionado y review D+7.",
        fewShotExample:
          '{"content":"Order completed → journey email + CRM tag.","score":91,"highlights":["webhook order.updated"],"metrics":["LTV flag"]}',
      },
      input,
      0.2,
    );
  }
}

export function getWooCommerceOrderAgent(): WooCommerceOrderAgent {
  return WooCommerceOrderAgent.instance;
}

export function resetWooCommerceOrderAgentForTests(): void {
  WooCommerceOrderAgent.reset();
}
