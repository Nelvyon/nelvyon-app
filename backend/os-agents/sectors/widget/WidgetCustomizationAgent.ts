import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-customization";

export class WidgetCustomizationAgent {
  private static inst: WidgetCustomizationAgent | undefined;

  static get instance(): WidgetCustomizationAgent {
    if (!WidgetCustomizationAgent.inst) WidgetCustomizationAgent.inst = new WidgetCustomizationAgent();
    return WidgetCustomizationAgent.inst;
  }

  static reset(): void {
    WidgetCustomizationAgent.inst = undefined;
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
          "ROLE: Design systems for embeds top 1%; tokens CSS y accesibilidad AA.",
        mission:
          "Personaliza colores, fuentes y estilos del widget por marca; variables CSS y guía corta.",
        fewShotExample:
          "Input: marca teal. Output JSON: embedCode :root tokens; previewData paleta nombres.",
      },
      input,
      0.5,
    );
  }
}

export function getWidgetCustomizationAgent(): WidgetCustomizationAgent {
  return WidgetCustomizationAgent.instance;
}

export function resetWidgetCustomizationAgentForTests(): void {
  WidgetCustomizationAgent.reset();
}
