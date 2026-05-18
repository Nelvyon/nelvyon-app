import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-bundle";

export class SuperiorPerformanceBundleAgent {
  private static inst: SuperiorPerformanceBundleAgent | undefined;

  static get instance(): SuperiorPerformanceBundleAgent {
    if (!SuperiorPerformanceBundleAgent.inst) SuperiorPerformanceBundleAgent.inst = new SuperiorPerformanceBundleAgent();
    return SuperiorPerformanceBundleAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceBundleAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance Bundle** — optimización JS/CSS.";
    const mission =
      "Optimiza **tree shaking, code splitting y minificación** de bundles para **INP <100ms**.";
    const fewShot =
      '{"content":"JS CSS tree shaking code splitting minification INP <100ms","score":88,"highlights":["Code splitting","INP <100ms"],"metrics":["Bundle size"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorPerformanceBundleAgent(): SuperiorPerformanceBundleAgent {
  return SuperiorPerformanceBundleAgent.instance;
}

export function resetSuperiorPerformanceBundleAgentForTests(): void {
  SuperiorPerformanceBundleAgent.reset();
}
