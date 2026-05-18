import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-reminder";

export class GCalZoomReminderAgent {
  private static inst: GCalZoomReminderAgent | undefined;

  static get instance(): GCalZoomReminderAgent {
    if (!GCalZoomReminderAgent.inst) GCalZoomReminderAgent.inst = new GCalZoomReminderAgent();
    return GCalZoomReminderAgent.inst;
  }

  static reset(): void {
    GCalZoomReminderAgent.inst = undefined;
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
        eliteRole: "ROLE: Multi-channel reminders; ventanas -24h -1h -15m.",
        mission:
          "Envía **recordatorios automáticos** antes de reuniones (email/push/in-app) con enlace Zoom y agenda; respeta timezone.",
        fewShotExample:
          '{"content":"Reminder T-15 con join link y ICS.","score":89,"highlights":["TZ usuario","Opt-out"],"metrics":["Delivered"]}',
      },
      input,
      0.5,
    );
  }
}

export function getGCalZoomReminderAgent(): GCalZoomReminderAgent {
  return GCalZoomReminderAgent.instance;
}

export function resetGCalZoomReminderAgentForTests(): void {
  GCalZoomReminderAgent.reset();
}
