import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-sync";

export class GCalZoomSyncAgent {
  private static inst: GCalZoomSyncAgent | undefined;

  static get instance(): GCalZoomSyncAgent {
    if (!GCalZoomSyncAgent.inst) GCalZoomSyncAgent.inst = new GCalZoomSyncAgent();
    return GCalZoomSyncAgent.inst;
  }

  static reset(): void {
    GCalZoomSyncAgent.inst = undefined;
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
        eliteRole: "ROLE: Bidirectional calendar sync; editorial OS ↔ Google.",
        mission:
          "Sincroniza **calendario editorial NELVYON** con **Google Calendar**: crear/actualizar/borrar eventos; manejo conflictos y sync token.",
        fewShotExample:
          '{"content":"Push campaña blog → bloques GC etiquetados.","score":88,"highlights":["Webhook push","Polling fallback"],"metrics":["Lag sync"]}',
      },
      input,
      0.2,
    );
  }
}

export function getGCalZoomSyncAgent(): GCalZoomSyncAgent {
  return GCalZoomSyncAgent.instance;
}

export function resetGCalZoomSyncAgentForTests(): void {
  GCalZoomSyncAgent.reset();
}
