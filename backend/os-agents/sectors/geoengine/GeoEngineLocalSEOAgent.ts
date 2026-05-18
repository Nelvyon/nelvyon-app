import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-localseo";

export class GeoEngineLocalSEOAgent {
  private static inst: GeoEngineLocalSEOAgent | undefined;

  static get instance(): GeoEngineLocalSEOAgent {
    if (!GeoEngineLocalSEOAgent.inst) GeoEngineLocalSEOAgent.inst = new GeoEngineLocalSEOAgent();
    return GeoEngineLocalSEOAgent.inst;
  }

  static reset(): void {
    GeoEngineLocalSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Local SEO Specialist** — GMB, NAP y schema local.";
    const mission =
      "Optimiza **SEO local**: ficha **Google My Business**, **NAP** consistente y **schema LocalBusiness** por ciudad.";
    const fewShot =
      '{"content":"GMB optimized, NAP match, LocalBusiness JSON-LD","score":90,"highlights":["NAP consistente","GMB categories"],"metrics":["Local pack readiness"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getGeoEngineLocalSEOAgent(): GeoEngineLocalSEOAgent {
  return GeoEngineLocalSEOAgent.instance;
}

export function resetGeoEngineLocalSEOAgentForTests(): void {
  GeoEngineLocalSEOAgent.reset();
}
