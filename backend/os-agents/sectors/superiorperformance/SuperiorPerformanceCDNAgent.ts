import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-cdn";

export class SuperiorPerformanceCDNAgent {
  private static inst: SuperiorPerformanceCDNAgent | undefined;

  static get instance(): SuperiorPerformanceCDNAgent {
    if (!SuperiorPerformanceCDNAgent.inst) SuperiorPerformanceCDNAgent.inst = new SuperiorPerformanceCDNAgent();
    return SuperiorPerformanceCDNAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceCDNAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance CDN** — configuración CDN.";
    const mission =
      "Configura **edge locations, headers, preload y prefetch** para PageSpeed **>95**.";
    const fewShot =
      '{"content":"CDN edge headers preload prefetch PageSpeed 95+","score":89,"highlights":["PageSpeed 95+","Edge config"],"metrics":["CDN coverage"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorPerformanceCDNAgent(): SuperiorPerformanceCDNAgent {
  return SuperiorPerformanceCDNAgent.instance;
}

export function resetSuperiorPerformanceCDNAgentForTests(): void {
  SuperiorPerformanceCDNAgent.reset();
}
