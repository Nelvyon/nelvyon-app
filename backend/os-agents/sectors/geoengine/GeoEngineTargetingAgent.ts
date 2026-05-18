import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-targeting";

export class GeoEngineTargetingAgent {
  private static inst: GeoEngineTargetingAgent | undefined;

  static get instance(): GeoEngineTargetingAgent {
    if (!GeoEngineTargetingAgent.inst) GeoEngineTargetingAgent.inst = new GeoEngineTargetingAgent();
    return GeoEngineTargetingAgent.inst;
  }

  static reset(): void {
    GeoEngineTargetingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Targeting Strategist** — segmentos geográficos para campañas.";
    const mission =
      "Crea **segmentos geográficos** para campañas por zona; radios, exclusiones y priorización por mercados NELVYON.";
    const fewShot =
      '{"content":"Segments: MX-CDMX+GDL, CO-Bogotá, ES-Madrid+BCN","score":88,"highlights":["Zona CDMX","Exclude low intent"],"metrics":["Geo segments"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getGeoEngineTargetingAgent(): GeoEngineTargetingAgent {
  return GeoEngineTargetingAgent.instance;
}

export function resetGeoEngineTargetingAgentForTests(): void {
  GeoEngineTargetingAgent.reset();
}
