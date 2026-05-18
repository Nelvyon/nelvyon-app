import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-timing-optimizer";

export class ScalingTimingOptimizerAgent {
  private static inst: ScalingTimingOptimizerAgent | undefined;

  static get instance(): ScalingTimingOptimizerAgent {
    if (!ScalingTimingOptimizerAgent.inst) ScalingTimingOptimizerAgent.inst = new ScalingTimingOptimizerAgent();
    return ScalingTimingOptimizerAgent.inst;
  }

  static reset(): void {
    ScalingTimingOptimizerAgent.inst = undefined;
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
          "ROLE: Monetization timing analyst top 1%; momento correcto sin quemar confianza.",
        mission:
          "Detecta ventana óptima para presentar upgrade según uso, ciclo y eventos del brief.",
        fewShotExample:
          "Input: pico uso fin de mes. Output JSON: recommendation D-3 facturación; triggers spike API.",
      },
      input,
    );
  }
}

export function getScalingTimingOptimizerAgent(): ScalingTimingOptimizerAgent {
  return ScalingTimingOptimizerAgent.instance;
}

export function resetScalingTimingOptimizerAgentForTests(): void {
  ScalingTimingOptimizerAgent.reset();
}
