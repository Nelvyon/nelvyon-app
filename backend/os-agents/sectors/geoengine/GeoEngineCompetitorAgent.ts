import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-competitor";

export class GeoEngineCompetitorAgent {
  private static inst: GeoEngineCompetitorAgent | undefined;

  static get instance(): GeoEngineCompetitorAgent {
    if (!GeoEngineCompetitorAgent.inst) GeoEngineCompetitorAgent.inst = new GeoEngineCompetitorAgent();
    return GeoEngineCompetitorAgent.inst;
  }

  static reset(): void {
    GeoEngineCompetitorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Competitor Mapper** — competencia local por zona.";
    const mission =
      "Mapea **competidores locales** por zona geográfica; share of voice local y gaps por ciudad/región.";
    const fewShot =
      '{"content":"Competitors: 5 locales CDMX, 3 Bogotá, gap en reviews","score":84,"highlights":["Top 3 CDMX","Review gap"],"metrics":["Local SOV"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getGeoEngineCompetitorAgent(): GeoEngineCompetitorAgent {
  return GeoEngineCompetitorAgent.instance;
}

export function resetGeoEngineCompetitorAgentForTests(): void {
  GeoEngineCompetitorAgent.reset();
}
