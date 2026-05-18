import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-analytics";

export class WooCommerceAnalyticsAgent {
  private static inst: WooCommerceAnalyticsAgent | undefined;

  static get instance(): WooCommerceAnalyticsAgent {
    if (!WooCommerceAnalyticsAgent.inst) WooCommerceAnalyticsAgent.inst = new WooCommerceAnalyticsAgent();
    return WooCommerceAnalyticsAgent.inst;
  }

  static reset(): void {
    WooCommerceAnalyticsAgent.inst = undefined;
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
        eliteRole: "ROLE: Ecommerce KPI pack; cohort compradores.",
        mission:
          "Métricas: **conversión**, **AOV**, **LTV**, **top productos**, **churn comprador**; segmentos one_time / recurrentes / VIP.",
        fewShotExample:
          '{"content":"AOV 62€; VIP 8% clientes 41% revenue.","score":93,"highlights":["Funnel","Repeat"],"metrics":["churn 90d"]}',
      },
      input,
      0.1,
    );
  }
}

export function getWooCommerceAnalyticsAgent(): WooCommerceAnalyticsAgent {
  return WooCommerceAnalyticsAgent.instance;
}

export function resetWooCommerceAnalyticsAgentForTests(): void {
  WooCommerceAnalyticsAgent.reset();
}
