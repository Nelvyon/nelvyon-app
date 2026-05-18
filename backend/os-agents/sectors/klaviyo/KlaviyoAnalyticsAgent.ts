import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-analytics";

export class KlaviyoAnalyticsAgent {
  private static inst: KlaviyoAnalyticsAgent | undefined;

  static get instance(): KlaviyoAnalyticsAgent {
    if (!KlaviyoAnalyticsAgent.inst) KlaviyoAnalyticsAgent.inst = new KlaviyoAnalyticsAgent();
    return KlaviyoAnalyticsAgent.inst;
  }

  static reset(): void {
    KlaviyoAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Klaviyo Analytics Lead** — **open rate, CTR, revenue atribuido, unsubscribe rate** vs benchmarks (OR >35%, CTR >3%, unsub ≤0.2%).";
    const mission =
      "Construye **dashboard interpretativo**: cohortes por flow/campaña, atribución revenue, alertas de fatiga de lista y recomendaciones accionables.";
    const fewShot =
      '{"content":"Flow revenue + unsub spike alert","score":93,"highlights":["Attributed $","Unsub 0.2% cap"],"metrics":["OR/CTR trend"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getKlaviyoAnalyticsAgent(): KlaviyoAnalyticsAgent {
  return KlaviyoAnalyticsAgent.instance;
}

export function resetKlaviyoAnalyticsAgentForTests(): void {
  KlaviyoAnalyticsAgent.reset();
}
