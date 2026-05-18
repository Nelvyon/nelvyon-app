import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-analytics-tracker";

export class WidgetAnalyticsTrackerAgent {
  private static inst: WidgetAnalyticsTrackerAgent | undefined;

  static get instance(): WidgetAnalyticsTrackerAgent {
    if (!WidgetAnalyticsTrackerAgent.inst) WidgetAnalyticsTrackerAgent.inst = new WidgetAnalyticsTrackerAgent();
    return WidgetAnalyticsTrackerAgent.inst;
  }

  static reset(): void {
    WidgetAnalyticsTrackerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWidgetLlm();
  }

  async run(input: WidgetInput): Promise<WidgetOutput> {
    return runWidgetAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Privacy-aware analytics snippet designer top 1%; eventos mínimos necesarios.",
        mission:
          "Genera código de tracking de interacciones con el widget: postMessage o beacon con consentimiento.",
        fewShotExample:
          "Input: widget id W-99. Output JSON: embedCode listener snippet; previewData eventos nombre.",
      },
      input,
      0.1,
    );
  }
}

export function getWidgetAnalyticsTrackerAgent(): WidgetAnalyticsTrackerAgent {
  return WidgetAnalyticsTrackerAgent.instance;
}

export function resetWidgetAnalyticsTrackerAgentForTests(): void {
  WidgetAnalyticsTrackerAgent.reset();
}
