import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-seo";

export class WooCommerceSEOAgent {
  private static inst: WooCommerceSEOAgent | undefined;

  static get instance(): WooCommerceSEOAgent {
    if (!WooCommerceSEOAgent.inst) WooCommerceSEOAgent.inst = new WooCommerceSEOAgent();
    return WooCommerceSEOAgent.inst;
  }

  static reset(): void {
    WooCommerceSEOAgent.inst = undefined;
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
        eliteRole: "ROLE: On-page SEO + JSON-LD hygiene.",
        mission:
          "Optimiza **meta title** (<60), **meta description** (<160) y **schema JSON-LD Product + Review** automático por producto.",
        fewShotExample:
          '{"content":"Title 58c + Product schema + aggregateRating.","score":88,"highlights":["Slug friendly","Breadcrumbs"],"metrics":["Rich results"]}',
      },
      input,
      0.4,
    );
  }
}

export function getWooCommerceSEOAgent(): WooCommerceSEOAgent {
  return WooCommerceSEOAgent.instance;
}

export function resetWooCommerceSEOAgentForTests(): void {
  WooCommerceSEOAgent.reset();
}
