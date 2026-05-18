import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-cache";

export class SuperiorPerformanceCacheAgent {
  private static inst: SuperiorPerformanceCacheAgent | undefined;

  static get instance(): SuperiorPerformanceCacheAgent {
    if (!SuperiorPerformanceCacheAgent.inst) SuperiorPerformanceCacheAgent.inst = new SuperiorPerformanceCacheAgent();
    return SuperiorPerformanceCacheAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceCacheAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance Cache** — estrategia de caché.";
    const mission =
      "Diseña **CDN, browser cache, server cache y Redis** con invalidación para **TTFB <200ms**.";
    const fewShot =
      '{"content":"CDN browser server Redis cache invalidation TTFB <200ms","score":89,"highlights":["TTFB <200ms","Cache strategy"],"metrics":["Cache hit rate"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorPerformanceCacheAgent(): SuperiorPerformanceCacheAgent {
  return SuperiorPerformanceCacheAgent.instance;
}

export function resetSuperiorPerformanceCacheAgentForTests(): void {
  SuperiorPerformanceCacheAgent.reset();
}
