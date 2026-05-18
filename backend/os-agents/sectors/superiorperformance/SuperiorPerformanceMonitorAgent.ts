import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-monitor";

export class SuperiorPerformanceMonitorAgent {
  private static inst: SuperiorPerformanceMonitorAgent | undefined;

  static get instance(): SuperiorPerformanceMonitorAgent {
    if (!SuperiorPerformanceMonitorAgent.inst) SuperiorPerformanceMonitorAgent.inst = new SuperiorPerformanceMonitorAgent();
    return SuperiorPerformanceMonitorAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceMonitorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance Monitor** — monitoreo continuo.";
    const mission =
      "Monitorea **degradación, trending y comparativa temporal**; alertas **<2 min**.";
    const fewShot =
      '{"content":"Continuous monitoring degradation alerts trending comparison <2m","score":90,"highlights":["<2m alerts","Trending"],"metrics":["Alert latency"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorPerformanceMonitorAgent(): SuperiorPerformanceMonitorAgent {
  return SuperiorPerformanceMonitorAgent.instance;
}

export function resetSuperiorPerformanceMonitorAgentForTests(): void {
  SuperiorPerformanceMonitorAgent.reset();
}
