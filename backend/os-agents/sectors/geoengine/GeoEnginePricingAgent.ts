import type { ILlmClient } from "../../LlmClient";
import type { GeoEngineInput, GeoEngineOutput } from "./shared";
import { getDefaultGeoEngineLlm, runGeoEngineAgentCore } from "./shared";

const AGENT_ID = "geoengine-pricing";

export class GeoEnginePricingAgent {
  private static inst: GeoEnginePricingAgent | undefined;

  static get instance(): GeoEnginePricingAgent {
    if (!GeoEnginePricingAgent.inst) GeoEnginePricingAgent.inst = new GeoEnginePricingAgent();
    return GeoEnginePricingAgent.inst;
  }

  static reset(): void {
    GeoEnginePricingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGeoEngineLlm();
  }

  async run(input: GeoEngineInput): Promise<GeoEngineOutput> {
    const eliteRole =
      "Eres **GeoEngine Pricing Adjuster** — precios por poder adquisitivo regional.";
    const mission =
      "Ajusta **precios por país/región**: ES 100%, MX 60%, CO 50%, AR 40%, BR 55%; moneda y redondeo local.";
    const fewShot =
      '{"content":"Pricing index: ES 100 MX 60 CO 50 AR 40 BR 55","score":87,"highlights":["PPP bands","Local currency"],"metrics":["Price index"]}';
    return runGeoEngineAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getGeoEnginePricingAgent(): GeoEnginePricingAgent {
  return GeoEnginePricingAgent.instance;
}

export function resetGeoEnginePricingAgentForTests(): void {
  GeoEnginePricingAgent.reset();
}
