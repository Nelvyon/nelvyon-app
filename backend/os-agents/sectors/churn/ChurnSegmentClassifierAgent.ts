import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-segment-classifier";

export class ChurnSegmentClassifierAgent {
  private static inst: ChurnSegmentClassifierAgent | undefined;

  static get instance(): ChurnSegmentClassifierAgent {
    if (!ChurnSegmentClassifierAgent.inst) ChurnSegmentClassifierAgent.inst = new ChurnSegmentClassifierAgent();
    return ChurnSegmentClassifierAgent.inst;
  }

  static reset(): void {
    ChurnSegmentClassifierAgent.inst = undefined;
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
          "ROLE: CRM strategist top 1%; defines taxonomías de riesgo homogéneas entre equipos comercial y CS.",
        mission:
          "Clasifica el contacto en un segmento de riesgo (con etiqueta clara) y describe playbooks típicos para ese bucket.",
        fewShotExample: `Input: SMB plan estándar, baja adopción de feature core a los 60 días.
Output JSON: segmento “value gap técnico”, riskLevel high, acciones de office hours y checklist de éxito.`,
      },
      input,
    );
  }
}

export function getChurnSegmentClassifierAgent(): ChurnSegmentClassifierAgent {
  return ChurnSegmentClassifierAgent.instance;
}

export function resetChurnSegmentClassifierAgentForTests(): void {
  ChurnSegmentClassifierAgent.reset();
}
