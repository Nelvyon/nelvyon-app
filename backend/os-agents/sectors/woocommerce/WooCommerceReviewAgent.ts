import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-review";

export class WooCommerceReviewAgent {
  private static inst: WooCommerceReviewAgent | undefined;

  static get instance(): WooCommerceReviewAgent {
    if (!WooCommerceReviewAgent.inst) WooCommerceReviewAgent.inst = new WooCommerceReviewAgent();
    return WooCommerceReviewAgent.inst;
  }

  static reset(): void {
    WooCommerceReviewAgent.inst = undefined;
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
        eliteRole: "ROLE: Review generation loop; moderación sentimiento.",
        mission:
          "Solicita y gestiona **reviews de producto** automáticamente (post-compra D+7), moderación básica y respuesta sugerida tienda.",
        fewShotExample:
          '{"content":"Email D+7 con deep link review + incentivo soft.","score":87,"highlights":["Verified buyer"],"metrics":["Response rate"]}',
      },
      input,
      0.2,
    );
  }
}

export function getWooCommerceReviewAgent(): WooCommerceReviewAgent {
  return WooCommerceReviewAgent.instance;
}

export function resetWooCommerceReviewAgentForTests(): void {
  WooCommerceReviewAgent.reset();
}
