import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-expansion-revenue";

export class ScalingExpansionRevenueAgent {
  private static inst: ScalingExpansionRevenueAgent | undefined;

  static get instance(): ScalingExpansionRevenueAgent {
    if (!ScalingExpansionRevenueAgent.inst) ScalingExpansionRevenueAgent.inst = new ScalingExpansionRevenueAgent();
    return ScalingExpansionRevenueAgent.inst;
  }

  static reset(): void {
    ScalingExpansionRevenueAgent.inst = undefined;
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
          "ROLE: NRR expansion hunter top 1%; land-and-expand sin saturar al cliente.",
        mission:
          "Identifica oportunidades de expansión de revenue en cuenta existente: upsell, cross-sell, seats.",
        fewShotExample:
          "Input: nuevo departamento onboard. Output JSON: recommendation módulo analytics; triggers multi-BU.",
      },
      input,
    );
  }
}

export function getScalingExpansionRevenueAgent(): ScalingExpansionRevenueAgent {
  return ScalingExpansionRevenueAgent.instance;
}

export function resetScalingExpansionRevenueAgentForTests(): void {
  ScalingExpansionRevenueAgent.reset();
}
