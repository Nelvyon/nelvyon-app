import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-technical";

export class SuperiorSeoTechnicalAgent {
  private static inst: SuperiorSeoTechnicalAgent | undefined;

  static get instance(): SuperiorSeoTechnicalAgent {
    if (!SuperiorSeoTechnicalAgent.inst) SuperiorSeoTechnicalAgent.inst = new SuperiorSeoTechnicalAgent();
    return SuperiorSeoTechnicalAgent.inst;
  }

  static reset(): void {
    SuperiorSeoTechnicalAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo Technical Auditor** — CWV, crawl e indexación.";
    const mission =
      "Audita **técnico**: **Core Web Vitals** (LCP <1.5s, CLS <0.05, INP <100ms), crawlability, indexación, canonicals, hreflang.";
    const fewShot =
      '{"content":"CWV pass, crawl/index fixes, canonical/hreflang map","score":92,"highlights":["LCP <1.5s","Index health"],"metrics":["CWV status"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorSeoTechnicalAgent(): SuperiorSeoTechnicalAgent {
  return SuperiorSeoTechnicalAgent.instance;
}

export function resetSuperiorSeoTechnicalAgentForTests(): void {
  SuperiorSeoTechnicalAgent.reset();
}
