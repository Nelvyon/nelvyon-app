import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-retentionanalytics";

export class RetentionAnalyticsAgent {
  private static inst: RetentionAnalyticsAgent | undefined;

  static get instance(): RetentionAnalyticsAgent {
    if (!RetentionAnalyticsAgent.inst) RetentionAnalyticsAgent.inst = new RetentionAnalyticsAgent();
    return RetentionAnalyticsAgent.inst;
  }

  static reset(): void {
    RetentionAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **Retention Analytics** — cohortes y retención.";
    const mission =
      "Mide **cohortes de retención** día **1/7/30** con actualización **cada 24 horas** y **alertas de caída** automáticas.";
    const fewShot =
      '{"content":"Retention: cohortes D1/D7/D30, update 24 h, alertas caída","score":90,"highlights":["Update 24 h","D1/D7/D30"],"metrics":["Retention cohorts"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRetentionAnalyticsAgent(): RetentionAnalyticsAgent {
  return RetentionAnalyticsAgent.instance;
}

export function resetRetentionAnalyticsAgentForTests(): void {
  RetentionAnalyticsAgent.reset();
}
