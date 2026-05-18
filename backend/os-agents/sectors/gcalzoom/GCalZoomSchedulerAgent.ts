import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-scheduler";

export class GCalZoomSchedulerAgent {
  private static inst: GCalZoomSchedulerAgent | undefined;

  static get instance(): GCalZoomSchedulerAgent {
    if (!GCalZoomSchedulerAgent.inst) GCalZoomSchedulerAgent.inst = new GCalZoomSchedulerAgent();
    return GCalZoomSchedulerAgent.inst;
  }

  static reset(): void {
    GCalZoomSchedulerAgent.inst = undefined;
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
        eliteRole: "ROLE: Event + Zoom meeting orchestrator; timezone cliente.",
        mission:
          "Crea y programa **eventos Google Calendar** con **reunión Zoom** adjunta (join URL, ICS); tipos demo / onboarding / review_mensual / upsell / soporte.",
        fewShotExample:
          '{"content":"Evento GC + Zoom meeting id 882… integrado.","score":91,"highlights":["Conference data","Invitados"],"metrics":["meet.google vs zoom"]}',
      },
      input,
      0.2,
    );
  }
}

export function getGCalZoomSchedulerAgent(): GCalZoomSchedulerAgent {
  return GCalZoomSchedulerAgent.instance;
}

export function resetGCalZoomSchedulerAgentForTests(): void {
  GCalZoomSchedulerAgent.reset();
}
