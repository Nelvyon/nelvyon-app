import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-funnelanalytics";

export class FunnelAnalyticsAgent {
  private static inst: FunnelAnalyticsAgent | undefined;

  static get instance(): FunnelAnalyticsAgent {
    if (!FunnelAnalyticsAgent.inst) FunnelAnalyticsAgent.inst = new FunnelAnalyticsAgent();
    return FunnelAnalyticsAgent.inst;
  }

  static reset(): void {
    FunnelAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **Funnel Analytics** — conversión y drop-off.";
    const mission =
      "Analiza **funnels de conversión**, **drop-off** y **optimización automática** en **<60 segundos**.";
    const fewShot =
      '{"content":"Funnel analytics: conversión, drop-off, optimización auto, <60 s","score":91,"highlights":["<60 s funnel","Drop-off"],"metrics":["Funnel analysis time"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getFunnelAnalyticsAgent(): FunnelAnalyticsAgent {
  return FunnelAnalyticsAgent.instance;
}

export function resetFunnelAnalyticsAgentForTests(): void {
  FunnelAnalyticsAgent.reset();
}
