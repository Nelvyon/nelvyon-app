import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-roi-calculator";

export class WidgetROICalculatorAgent {
  private static inst: WidgetROICalculatorAgent | undefined;

  static get instance(): WidgetROICalculatorAgent {
    if (!WidgetROICalculatorAgent.inst) WidgetROICalculatorAgent.inst = new WidgetROICalculatorAgent();
    return WidgetROICalculatorAgent.inst;
  }

  static reset(): void {
    WidgetROICalculatorAgent.inst = undefined;
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
          "ROLE: Interactive ROI embed engineer top 1%; fórmulas explícitas y disclaimer.",
        mission:
          "Genera calculadora ROI embebible con inputs, outputs y validación básica en JS.",
        fewShotExample:
          "Input: ahorro horas. Output JSON: embedCode form+script; previewData supuestos default.",
      },
      input,
      0.1,
    );
  }
}

export function getWidgetROICalculatorAgent(): WidgetROICalculatorAgent {
  return WidgetROICalculatorAgent.instance;
}

export function resetWidgetROICalculatorAgentForTests(): void {
  WidgetROICalculatorAgent.reset();
}
