import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-usage-analyzer";

export class ScalingUsageAnalyzerAgent {
  private static inst: ScalingUsageAnalyzerAgent | undefined;

  static get instance(): ScalingUsageAnalyzerAgent {
    if (!ScalingUsageAnalyzerAgent.inst) ScalingUsageAnalyzerAgent.inst = new ScalingUsageAnalyzerAgent();
    return ScalingUsageAnalyzerAgent.inst;
  }

  static reset(): void {
    ScalingUsageAnalyzerAgent.inst = undefined;
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
          "ROLE: Usage intelligence analyst top 1%; señales de upgrade sin alarmismo.",
        mission:
          "Analiza patrones de uso y detecta señales claras de necesidad de upgrade o add-on.",
        fewShotExample:
          "Input: API calls cerca del límite. Output JSON: recommendation upgrade tier; triggers límite 85%.",
      },
      input,
    );
  }
}

export function getScalingUsageAnalyzerAgent(): ScalingUsageAnalyzerAgent {
  return ScalingUsageAnalyzerAgent.instance;
}

export function resetScalingUsageAnalyzerAgentForTests(): void {
  ScalingUsageAnalyzerAgent.reset();
}
