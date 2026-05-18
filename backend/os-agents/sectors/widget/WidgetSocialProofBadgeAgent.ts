import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-social-proof-badge";

export class WidgetSocialProofBadgeAgent {
  private static inst: WidgetSocialProofBadgeAgent | undefined;

  static get instance(): WidgetSocialProofBadgeAgent {
    if (!WidgetSocialProofBadgeAgent.inst) WidgetSocialProofBadgeAgent.inst = new WidgetSocialProofBadgeAgent();
    return WidgetSocialProofBadgeAgent.inst;
  }

  static reset(): void {
    WidgetSocialProofBadgeAgent.inst = undefined;
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
          "ROLE: Social proof micro-widget designer top 1%; confianza sin claims falsos.",
        mission:
          "Crea badge embebible de prueba social usando solo métricas del brief.",
        fewShotExample:
          "Input: 500+ clientes. Output JSON: embedCode badge SVG/text; previewData frases cortas.",
      },
      input,
      0.5,
    );
  }
}

export function getWidgetSocialProofBadgeAgent(): WidgetSocialProofBadgeAgent {
  return WidgetSocialProofBadgeAgent.instance;
}

export function resetWidgetSocialProofBadgeAgentForTests(): void {
  WidgetSocialProofBadgeAgent.reset();
}
