import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-analytics";

export class PrestaShopAnalyticsAgent {
  private static inst: PrestaShopAnalyticsAgent | undefined;

  static get instance(): PrestaShopAnalyticsAgent {
    if (!PrestaShopAnalyticsAgent.inst) PrestaShopAnalyticsAgent.inst = new PrestaShopAnalyticsAgent();
    return PrestaShopAnalyticsAgent.inst;
  }

  static reset(): void {
    PrestaShopAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPrestaShopLlm();
  }

  async run(input: PrestaShopInput): Promise<PrestaShopOutput> {
    return runPrestaShopAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "Eres **PrestaShop Revenue Analyst** — conversión, ticket y cohortes por mercado.",
        mission:
          "Informe **métricas PrestaShop**: **conversión**, **AOV**, **LTV**, **top productos**; desglose ES/FR/IT y segmentos one_time / recurring / VIP.",
        fewShotExample:
          '{"content":"CR 2.8% AOV €62 LTV €210 top SKUs ES","score":93,"highlights":["Conversion","AOV"],"metrics":["LTV"]}',
      },
      input,
      0.1,
    );
  }
}

export function getPrestaShopAnalyticsAgent(): PrestaShopAnalyticsAgent {
  return PrestaShopAnalyticsAgent.instance;
}

export function resetPrestaShopAnalyticsAgentForTests(): void {
  PrestaShopAnalyticsAgent.reset();
}
