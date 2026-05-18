import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-analytics";

export class GCalZoomAnalyticsAgent {
  private static inst: GCalZoomAnalyticsAgent | undefined;

  static get instance(): GCalZoomAnalyticsAgent {
    if (!GCalZoomAnalyticsAgent.inst) GCalZoomAnalyticsAgent.inst = new GCalZoomAnalyticsAgent();
    return GCalZoomAnalyticsAgent.inst;
  }

  static reset(): void {
    GCalZoomAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGCalZoomLlm();
  }

  async run(input: GCalZoomInput): Promise<GCalZoomOutput> {
    return runGCalZoomAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Meetings funnel KPIs; no-show tracking.",
        mission:
          "Métricas: **reuniones/mes**, **asistencia**, **duración media**, **no-shows**; correlación con tipo demo/onboarding/review.",
        fewShotExample:
          '{"content":"No-show 12%; duración media 42 min.","score":93,"highlights":["5 min rule mail"],"metrics":["series mensual"]}',
      },
      input,
      0.1,
    );
  }
}

export function getGCalZoomAnalyticsAgent(): GCalZoomAnalyticsAgent {
  return GCalZoomAnalyticsAgent.instance;
}

export function resetGCalZoomAnalyticsAgentForTests(): void {
  GCalZoomAnalyticsAgent.reset();
}
