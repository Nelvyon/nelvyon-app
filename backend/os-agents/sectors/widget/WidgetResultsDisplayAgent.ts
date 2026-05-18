import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-results-display";

export class WidgetResultsDisplayAgent {
  private static inst: WidgetResultsDisplayAgent | undefined;

  static get instance(): WidgetResultsDisplayAgent {
    if (!WidgetResultsDisplayAgent.inst) WidgetResultsDisplayAgent.inst = new WidgetResultsDisplayAgent();
    return WidgetResultsDisplayAgent.inst;
  }

  static reset(): void {
    WidgetResultsDisplayAgent.inst = undefined;
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
          "ROLE: Embeddable KPI designer top 1%; claridad visual y copy mínimo.",
        mission:
          "Genera widget de resultados clave para embeber: markup ligero y datos del brief.",
        fewShotExample:
          "Input: leads +32%. Output JSON: embedCode div+CSS; previewData métrica titular.",
      },
      input,
      0.5,
    );
  }
}

export function getWidgetResultsDisplayAgent(): WidgetResultsDisplayAgent {
  return WidgetResultsDisplayAgent.instance;
}

export function resetWidgetResultsDisplayAgentForTests(): void {
  WidgetResultsDisplayAgent.reset();
}
