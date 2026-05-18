import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-annual-conversion";

export class ScalingAnnualConversionAgent {
  private static inst: ScalingAnnualConversionAgent | undefined;

  static get instance(): ScalingAnnualConversionAgent {
    if (!ScalingAnnualConversionAgent.inst) ScalingAnnualConversionAgent.inst = new ScalingAnnualConversionAgent();
    return ScalingAnnualConversionAgent.inst;
  }

  static reset(): void {
    ScalingAnnualConversionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultScalingLlm();
  }

  async run(input: ScalingInput): Promise<ScalingOutput> {
    return runScalingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Annual plan growth PM top 1%; incentivos claros y LTV honesto.",
        mission:
          "Genera campaña mensual→anual: mensajes, incentivos y reglas de elegibilidad.",
        fewShotExample:
          "Input: cliente 6 meses monthly. Output JSON: recommendation 2 meses gratis anual; triggers tenure.",
      },
      input,
    );
  }
}

export function getScalingAnnualConversionAgent(): ScalingAnnualConversionAgent {
  return ScalingAnnualConversionAgent.instance;
}

export function resetScalingAnnualConversionAgentForTests(): void {
  ScalingAnnualConversionAgent.reset();
}
