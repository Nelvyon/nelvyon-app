import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-recorder";

export class GCalZoomRecorderAgent {
  private static inst: GCalZoomRecorderAgent | undefined;

  static get instance(): GCalZoomRecorderAgent {
    if (!GCalZoomRecorderAgent.inst) GCalZoomRecorderAgent.inst = new GCalZoomRecorderAgent();
    return GCalZoomRecorderAgent.inst;
  }

  static reset(): void {
    GCalZoomRecorderAgent.inst = undefined;
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
        eliteRole: "ROLE: Recording pipeline + IA resumen <2 min SLA.",
        mission:
          "Gestiona **grabaciones Zoom**: descarga, almacenamiento seguro, **resumen IA en menos de 2 minutos**; guardar en **gcalzoom_results** con **timestamp** y **participantes**.",
        fewShotExample:
          '{"content":"Recording UUID → transcript → summary 90s.","score":92,"highlights":["Participantes","Stored"],"metrics":["latencia IA"]}',
      },
      input,
      0.2,
    );
  }
}

export function getGCalZoomRecorderAgent(): GCalZoomRecorderAgent {
  return GCalZoomRecorderAgent.instance;
}

export function resetGCalZoomRecorderAgentForTests(): void {
  GCalZoomRecorderAgent.reset();
}
