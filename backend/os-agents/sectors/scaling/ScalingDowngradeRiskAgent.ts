import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-downgrade-risk";

export class ScalingDowngradeRiskAgent {
  private static inst: ScalingDowngradeRiskAgent | undefined;

  static get instance(): ScalingDowngradeRiskAgent {
    if (!ScalingDowngradeRiskAgent.inst) ScalingDowngradeRiskAgent.inst = new ScalingDowngradeRiskAgent();
    return ScalingDowngradeRiskAgent.inst;
  }

  static reset(): void {
    ScalingDowngradeRiskAgent.inst = undefined;
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
          "ROLE: Churn prevention strategist top 1%; salvar cuenta con ofertas justas.",
        mission:
          "Detecta riesgo de downgrade y diseña intervención preventiva con pasos y mensajes.",
        fewShotExample:
          "Input: uso en caída 30d. Output JSON: recommendation health check call; triggers WAU -40%.",
      },
      input,
    );
  }
}

export function getScalingDowngradeRiskAgent(): ScalingDowngradeRiskAgent {
  return ScalingDowngradeRiskAgent.instance;
}

export function resetScalingDowngradeRiskAgentForTests(): void {
  ScalingDowngradeRiskAgent.reset();
}
