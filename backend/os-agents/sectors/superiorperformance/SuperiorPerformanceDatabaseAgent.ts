import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-database";

export class SuperiorPerformanceDatabaseAgent {
  private static inst: SuperiorPerformanceDatabaseAgent | undefined;

  static get instance(): SuperiorPerformanceDatabaseAgent {
    if (!SuperiorPerformanceDatabaseAgent.inst) SuperiorPerformanceDatabaseAgent.inst = new SuperiorPerformanceDatabaseAgent();
    return SuperiorPerformanceDatabaseAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceDatabaseAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance Database** — optimización SQL.";
    const mission =
      "Optimiza **índices, detección N+1, query plans y pooling** para **TTFB <200ms**.";
    const fewShot =
      '{"content":"SQL indexes N+1 detection query plans pooling TTFB <200ms","score":91,"highlights":["N+1 detection","TTFB <200ms"],"metrics":["Query latency"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorPerformanceDatabaseAgent(): SuperiorPerformanceDatabaseAgent {
  return SuperiorPerformanceDatabaseAgent.instance;
}

export function resetSuperiorPerformanceDatabaseAgentForTests(): void {
  SuperiorPerformanceDatabaseAgent.reset();
}
