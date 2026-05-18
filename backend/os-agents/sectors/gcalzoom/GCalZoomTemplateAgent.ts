import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-template";

export class GCalZoomTemplateAgent {
  private static inst: GCalZoomTemplateAgent | undefined;

  static get instance(): GCalZoomTemplateAgent {
    if (!GCalZoomTemplateAgent.inst) GCalZoomTemplateAgent.inst = new GCalZoomTemplateAgent();
    return GCalZoomTemplateAgent.inst;
  }

  static reset(): void {
    GCalZoomTemplateAgent.inst = undefined;
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
        eliteRole: "ROLE: Playbook library por tipo de reunión.",
        mission:
          "Plantillas de reunión por tipo (**demo**, **onboarding**, **review_mensual**, **upsell**, **soporte**): agenda, duración default, checklist host, recording policy.",
        fewShotExample:
          '{"content":"Template onboarding 45m + 15 Q&A; soporte 25m.","score":87,"highlights":["Agenda markdown","Zoom settings"],"metrics":["template_id"]}',
      },
      input,
      0.7,
    );
  }
}

export function getGCalZoomTemplateAgent(): GCalZoomTemplateAgent {
  return GCalZoomTemplateAgent.instance;
}

export function resetGCalZoomTemplateAgentForTests(): void {
  GCalZoomTemplateAgent.reset();
}
