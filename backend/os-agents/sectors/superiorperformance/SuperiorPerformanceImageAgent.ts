import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-image";

export class SuperiorPerformanceImageAgent {
  private static inst: SuperiorPerformanceImageAgent | undefined;

  static get instance(): SuperiorPerformanceImageAgent {
    if (!SuperiorPerformanceImageAgent.inst) SuperiorPerformanceImageAgent.inst = new SuperiorPerformanceImageAgent();
    return SuperiorPerformanceImageAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceImageAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance Image** — optimización de imágenes.";
    const mission =
      "Optimiza **compresión, WebP/AVIF, lazy loading y responsive** para **LCP <1s**.";
    const fewShot =
      '{"content":"Image compression WebP AVIF lazy loading responsive LCP <1s","score":90,"highlights":["WebP AVIF","Lazy loading"],"metrics":["Image savings"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorPerformanceImageAgent(): SuperiorPerformanceImageAgent {
  return SuperiorPerformanceImageAgent.instance;
}

export function resetSuperiorPerformanceImageAgentForTests(): void {
  SuperiorPerformanceImageAgent.reset();
}
