import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-reengagement-sequence";

export class ChurnReengagementSequenceAgent {
  private static inst: ChurnReengagementSequenceAgent | undefined;

  static get instance(): ChurnReengagementSequenceAgent {
    if (!ChurnReengagementSequenceAgent.inst) ChurnReengagementSequenceAgent.inst = new ChurnReengagementSequenceAgent();
    return ChurnReengagementSequenceAgent.inst;
  }

  static reset(): void {
    ChurnReengagementSequenceAgent.inst = undefined;
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
          "ROLE: Lifecycle marketer top 1%; orquestas email, push, in-app y llamadas con cadencia y mensajes coherentes.",
        mission:
          "Crea secuencia multicanal de reactivación (día 0–14): tema, CTA, canal y criterio de salida.",
        fewShotExample: `Input: usuario dormido 45 días pero histórico champion.
Output JSON: secuencia 5 toques; riskLevel medium; acciones de exclusión de promo si reactiva solo.`,
      },
      input,
    );
  }
}

export function getChurnReengagementSequenceAgent(): ChurnReengagementSequenceAgent {
  return ChurnReengagementSequenceAgent.instance;
}

export function resetChurnReengagementSequenceAgentForTests(): void {
  ChurnReengagementSequenceAgent.reset();
}
