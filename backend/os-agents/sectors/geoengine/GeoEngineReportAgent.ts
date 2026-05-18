import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-report";

export class GeoEngineReportAgent {
  private static inst: GeoEngineReportAgent | undefined;

  static get instance(): GeoEngineReportAgent {
    if (!GeoEngineReportAgent.inst) GeoEngineReportAgent.inst = new GeoEngineReportAgent();
    return GeoEngineReportAgent.inst;
  }

  static reset(): void {
    GeoEngineReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Performance Reporter** — rendimiento por país/región/ciudad.";
    const mission =
      "Reporta **rendimiento por país, región y ciudad**: tráfico, conversión, revenue y ranking de mercados prioritarios.";
    const fewShot =
      '{"content":"Report: ES lead conv, MX volume, CO CAC","score":85,"highlights":["Top city Madrid","MX volume"],"metrics":["Conv by geo"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getGeoEngineReportAgent(): GeoEngineReportAgent {
  return GeoEngineReportAgent.instance;
}

export function resetGeoEngineReportAgentForTests(): void {
  GeoEngineReportAgent.reset();
}
