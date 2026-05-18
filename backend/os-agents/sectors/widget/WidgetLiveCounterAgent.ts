import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-live-counter";

export class WidgetLiveCounterAgent {
  private static inst: WidgetLiveCounterAgent | undefined;

  static get instance(): WidgetLiveCounterAgent {
    if (!WidgetLiveCounterAgent.inst) WidgetLiveCounterAgent.inst = new WidgetLiveCounterAgent();
    return WidgetLiveCounterAgent.inst;
  }

  static reset(): void {
    WidgetLiveCounterAgent.inst = undefined;
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
          "ROLE: Real-time counter embed engineer top 1%; throttling y fuente de datos explícita.",
        mission:
          "Genera widget de contador en vivo con placeholder de API y animación segura.",
        fewShotExample:
          "Input: usuarios activos. Output JSON: embedCode JS vanilla; previewData endpoint TODO.",
      },
      input,
      0.1,
    );
  }
}

export function getWidgetLiveCounterAgent(): WidgetLiveCounterAgent {
  return WidgetLiveCounterAgent.instance;
}

export function resetWidgetLiveCounterAgentForTests(): void {
  WidgetLiveCounterAgent.reset();
}
