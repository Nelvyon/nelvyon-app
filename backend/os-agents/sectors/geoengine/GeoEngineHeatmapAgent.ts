import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-heatmap";

export class GeoEngineHeatmapAgent {
  private static inst: GeoEngineHeatmapAgent | undefined;

  static get instance(): GeoEngineHeatmapAgent {
    if (!GeoEngineHeatmapAgent.inst) GeoEngineHeatmapAgent.inst = new GeoEngineHeatmapAgent();
    return GeoEngineHeatmapAgent.inst;
  }

  static reset(): void {
    GeoEngineHeatmapAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Heatmap Analyst** — actividad por zona geográfica.";
    const mission =
      "Genera **heatmaps de actividad** por zona geográfica; densidad de sesiones, conversiones y hotspots urbanos.";
    const fewShot =
      '{"content":"Heatmap: CDMX centro alto, GDL medio, norte bajo","score":86,"highlights":["Hotspot CDMX","Low AR north"],"metrics":["Activity density"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getGeoEngineHeatmapAgent(): GeoEngineHeatmapAgent {
  return GeoEngineHeatmapAgent.instance;
}

export function resetGeoEngineHeatmapAgentForTests(): void {
  GeoEngineHeatmapAgent.reset();
}
