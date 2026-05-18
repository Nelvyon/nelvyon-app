import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-pricing-anchor";

export class ScalingPricingAnchorAgent {
  private static inst: ScalingPricingAnchorAgent | undefined;

  static get instance(): ScalingPricingAnchorAgent {
    if (!ScalingPricingAnchorAgent.inst) ScalingPricingAnchorAgent.inst = new ScalingPricingAnchorAgent();
    return ScalingPricingAnchorAgent.inst;
  }

  static reset(): void {
    ScalingPricingAnchorAgent.inst = undefined;
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
          "ROLE: Value-based pricing communicator top 1%; anclaje ético al valor.",
        mission:
          "Construye argumentación de precio anclada al valor entregado y a alternativas reales.",
        fewShotExample:
          "Input: ahorro horas/mes. Output JSON: recommendation bundle anual; triggers coste oportunidad.",
      },
      input,
    );
  }
}

export function getScalingPricingAnchorAgent(): ScalingPricingAnchorAgent {
  return ScalingPricingAnchorAgent.instance;
}

export function resetScalingPricingAnchorAgentForTests(): void {
  ScalingPricingAnchorAgent.reset();
}
