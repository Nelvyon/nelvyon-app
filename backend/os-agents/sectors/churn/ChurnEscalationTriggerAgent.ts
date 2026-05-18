import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-escalation-trigger";

export class ChurnEscalationTriggerAgent {
  private static inst: ChurnEscalationTriggerAgent | undefined;

  static get instance(): ChurnEscalationTriggerAgent {
    if (!ChurnEscalationTriggerAgent.inst) ChurnEscalationTriggerAgent.inst = new ChurnEscalationTriggerAgent();
    return ChurnEscalationTriggerAgent.inst;
  }

  static reset(): void {
    ChurnEscalationTriggerAgent.inst = undefined;
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
          "ROLE: RevOps y escalamiento CS top 1%; balances automatización vs humano según ARR y severidad.",
        mission:
          "Decide si escalar a humano (sí/no + cuándo), qué información preparar y script de handoff; incluye umbral sugerido.",
        fewShotExample: `Input: ARR alto + sentimiento negativo en último ticket + silent churn pattern.
Output JSON: escalar sí en 24h, riskLevel critical, acciones de slack war-room y ejecutivo sponsor.`,
      },
      input,
    );
  }
}

export function getChurnEscalationTriggerAgent(): ChurnEscalationTriggerAgent {
  return ChurnEscalationTriggerAgent.instance;
}

export function resetChurnEscalationTriggerAgentForTests(): void {
  ChurnEscalationTriggerAgent.reset();
}
