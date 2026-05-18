import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-budget";

export class PerfPredictorBudgetAgent {
  private static inst: PerfPredictorBudgetAgent | undefined;

  static get instance(): PerfPredictorBudgetAgent {
    if (!PerfPredictorBudgetAgent.inst) PerfPredictorBudgetAgent.inst = new PerfPredictorBudgetAgent();
    return PerfPredictorBudgetAgent.inst;
  }

  static reset(): void {
    PerfPredictorBudgetAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Budget Allocator** — mix óptimo por objetivo.";
    const mission =
      "Recomienda **presupuesto óptimo por canal** según objetivo (ROAS, leads, revenue); límites de saturación y confianza 30d.";
    const fewShot =
      '{"content":"Optimal split Meta/Google/Email/SEO for ROAS goal","score":90,"highlights":["Channel budget","ROAS target"],"metrics":["Budget mix"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPerfPredictorBudgetAgent(): PerfPredictorBudgetAgent {
  return PerfPredictorBudgetAgent.instance;
}

export function resetPerfPredictorBudgetAgentForTests(): void {
  PerfPredictorBudgetAgent.reset();
}
