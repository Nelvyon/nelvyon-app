import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-root-cause-analyst";

export class ChurnRootCauseAnalystAgent {
  private static inst: ChurnRootCauseAnalystAgent | undefined;

  static get instance(): ChurnRootCauseAnalystAgent {
    if (!ChurnRootCauseAnalystAgent.inst) ChurnRootCauseAnalystAgent.inst = new ChurnRootCauseAnalystAgent();
    return ChurnRootCauseAnalystAgent.inst;
  }

  static reset(): void {
    ChurnRootCauseAnalystAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChurnLlm();
  }

  async run(input: ChurnInput): Promise<ChurnOutput> {
    return runChurnAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: RCA y VoC synthesis top 1%; separas síntomas de causas y evitas sesgo de narrativa única.",
        mission:
          "Analiza causa raíz probable del riesgo (producto, pricing, soporte, fit ICP) con hipótesis falsables.",
        fewShotExample: `Input: churn verbal “no vemos ROI” pero datos muestran baja configuración inicial.
Output JSON: causa raíz “time-to-value alto”, riskLevel high, acciones de wizard y CS proactivo.`,
      },
      input,
    );
  }
}

export function getChurnRootCauseAnalystAgent(): ChurnRootCauseAnalystAgent {
  return ChurnRootCauseAnalystAgent.instance;
}

export function resetChurnRootCauseAnalystAgentForTests(): void {
  ChurnRootCauseAnalystAgent.reset();
}
