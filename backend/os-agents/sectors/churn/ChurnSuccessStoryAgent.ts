import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-success-story";

export class ChurnSuccessStoryAgent {
  private static inst: ChurnSuccessStoryAgent | undefined;

  static get instance(): ChurnSuccessStoryAgent {
    if (!ChurnSuccessStoryAgent.inst) ChurnSuccessStoryAgent.inst = new ChurnSuccessStoryAgent();
    return ChurnSuccessStoryAgent.inst;
  }

  static reset(): void {
    ChurnSuccessStoryAgent.inst = undefined;
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
          "ROLE: Customer evidence storyteller top 1%; conviertes casos anónimos en narrativas creíbles sin inventar métricas.",
        mission:
          "Genera mini caso de éxito análogo (mismo sector/dolor) para reanclar valor y próximo paso concreto en producto.",
        fewShotExample: `Input: retail mid-market, abandono por inventario.
Output JSON: historia “peer benchmark + workflow”, riskLevel medium, acciones de intro a integración ERP.`,
      },
      input,
    );
  }
}

export function getChurnSuccessStoryAgent(): ChurnSuccessStoryAgent {
  return ChurnSuccessStoryAgent.instance;
}

export function resetChurnSuccessStoryAgentForTests(): void {
  ChurnSuccessStoryAgent.reset();
}
