import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-content";

export class GeoEngineContentAgent {
  private static inst: GeoEngineContentAgent | undefined;

  static get instance(): GeoEngineContentAgent {
    if (!GeoEngineContentAgent.inst) GeoEngineContentAgent.inst = new GeoEngineContentAgent();
    return GeoEngineContentAgent.inst;
  }

  static reset(): void {
    GeoEngineContentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Content Localizer** — localización cultural, no solo traducción.";
    const mission =
      "Localiza **contenido**: idioma, moneda, **referencias culturales**, festividades y **términos locales** por país.";
    const fewShot =
      '{"content":"MX copy: Día de Muertos hook, MXN, modismos locales","score":89,"highlights":["Cultural refs","Local terms"],"metrics":["Locale fit"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getGeoEngineContentAgent(): GeoEngineContentAgent {
  return GeoEngineContentAgent.instance;
}

export function resetGeoEngineContentAgentForTests(): void {
  GeoEngineContentAgent.reset();
}
