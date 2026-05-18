import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-conversion";

export class FunnelMultipasoConversionAgent {
  private static inst: FunnelMultipasoConversionAgent | undefined;

  static get instance(): FunnelMultipasoConversionAgent {
    if (!FunnelMultipasoConversionAgent.inst) FunnelMultipasoConversionAgent.inst = new FunnelMultipasoConversionAgent();
    return FunnelMultipasoConversionAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoConversionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso Conversion** — optimización de conversión por paso.";
    const mission =
      "Optimiza **CRO automático** y **detección de fricción** por paso; conversión total **>3%** en tráfico frío.";
    const fewShot =
      '{"content":"Conversion: CRO auto, fricción por paso, >3% frío","score":92,"highlights":[">3% frío","CRO"],"metrics":["Step conversion"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getFunnelMultipasoConversionAgent(): FunnelMultipasoConversionAgent {
  return FunnelMultipasoConversionAgent.instance;
}

export function resetFunnelMultipasoConversionAgentForTests(): void {
  FunnelMultipasoConversionAgent.reset();
}
