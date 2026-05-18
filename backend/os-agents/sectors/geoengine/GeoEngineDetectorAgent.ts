import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-detector";

export class GeoEngineDetectorAgent {
  private static inst: GeoEngineDetectorAgent | undefined;

  static get instance(): GeoEngineDetectorAgent {
    if (!GeoEngineDetectorAgent.inst) GeoEngineDetectorAgent.inst = new GeoEngineDetectorAgent();
    return GeoEngineDetectorAgent.inst;
  }

  static reset(): void {
    GeoEngineDetectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Detector** — geolocalización de usuario y señales de idioma.";
    const mission =
      "Detecta **país, región, ciudad e idioma** del usuario; prioriza mercados ES/MX/CO/AR/CL/PE/US-hispano/BR.";
    const fewShot =
      '{"content":"Geo: MX-Ciudad de México, es-MX, confidence alta","score":92,"highlights":["País MX","Idioma es-MX"],"metrics":["Geo confidence"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getGeoEngineDetectorAgent(): GeoEngineDetectorAgent {
  return GeoEngineDetectorAgent.instance;
}

export function resetGeoEngineDetectorAgentForTests(): void {
  GeoEngineDetectorAgent.reset();
}
