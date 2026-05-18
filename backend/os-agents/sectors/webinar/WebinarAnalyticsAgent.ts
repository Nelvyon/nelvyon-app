import type { ILlmClient } from "../../LlmClient";
import type { WebinarInput, WebinarOutput } from "./shared";
import { getDefaultWebinarLlm, runWebinarAgentCore } from "./shared";

const AGENT_ID = "webinar-analytics";

export class WebinarAnalyticsAgent {
  private static inst: WebinarAnalyticsAgent | undefined;

  static get instance(): WebinarAnalyticsAgent {
    if (!WebinarAnalyticsAgent.inst) WebinarAnalyticsAgent.inst = new WebinarAnalyticsAgent();
    return WebinarAnalyticsAgent.inst;
  }

  static reset(): void {
    WebinarAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebinarLlm();
  }

  async run(input: WebinarInput): Promise<WebinarOutput> {
    const eliteRole = "Eres **Webinar Analytics** — métricas y ROI del webinar.";
    const mission =
      "Mide **asistencia**, **engagement score**, **conversión** y **ROI** vs benchmarks (**>60%** asistencia, **>15%** conversión).";
    const fewShot =
      '{"content":"Analytics: asistencia, engagement score, conversión, ROI, >60% >15%","score":88,"highlights":[">60% asistencia",">15% conversión"],"metrics":["ROI"]}';
    return runWebinarAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getWebinarAnalyticsAgent(): WebinarAnalyticsAgent {
  return WebinarAnalyticsAgent.instance;
}

export function resetWebinarAnalyticsAgentForTests(): void {
  WebinarAnalyticsAgent.reset();
}
