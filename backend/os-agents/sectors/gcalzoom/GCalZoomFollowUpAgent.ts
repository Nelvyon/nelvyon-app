import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-followup";

export class GCalZoomFollowUpAgent {
  private static inst: GCalZoomFollowUpAgent | undefined;

  static get instance(): GCalZoomFollowUpAgent {
    if (!GCalZoomFollowUpAgent.inst) GCalZoomFollowUpAgent.inst = new GCalZoomFollowUpAgent();
    return GCalZoomFollowUpAgent.inst;
  }

  static reset(): void {
    GCalZoomFollowUpAgent.inst = undefined;
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
        eliteRole: "ROLE: Post-meeting automation; ventana 30 min.",
        mission:
          "Genera **follow-up automático** dentro de **30 min post-reunión**: **resumen**, **action items**, **propuesta próxima reunión**; email al cliente + nota CRM.",
        fewShotExample:
          '{"content":"Follow-up T+25m con 3 action items y slot propuesto.","score":90,"highlights":["30 min SLA","Next meet"],"metrics":["Sent"]}',
      },
      input,
      0.5,
    );
  }
}

export function getGCalZoomFollowUpAgent(): GCalZoomFollowUpAgent {
  return GCalZoomFollowUpAgent.instance;
}

export function resetGCalZoomFollowUpAgentForTests(): void {
  GCalZoomFollowUpAgent.reset();
}
