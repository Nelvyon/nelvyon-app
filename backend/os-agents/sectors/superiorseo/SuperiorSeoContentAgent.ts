import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-content";

export class SuperiorSeoContentAgent {
  private static inst: SuperiorSeoContentAgent | undefined;

  static get instance(): SuperiorSeoContentAgent {
    if (!SuperiorSeoContentAgent.inst) SuperiorSeoContentAgent.inst = new SuperiorSeoContentAgent();
    return SuperiorSeoContentAgent.inst;
  }

  static reset(): void {
    SuperiorSeoContentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo Content Architect** — briefs, entidades y E-E-A-T.";
    const mission =
      "Crea **briefs SEO**, estructura de artículos, **entidades semánticas** y **E-E-A-T**; cobertura semántica **>95%**.";
    const fewShot =
      '{"content":"Content brief + entity map 96% coverage, E-E-A-T signals","score":91,"highlights":[">95% entities","E-E-A-T"],"metrics":["Semantic coverage"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorSeoContentAgent(): SuperiorSeoContentAgent {
  return SuperiorSeoContentAgent.instance;
}

export function resetSuperiorSeoContentAgentForTests(): void {
  SuperiorSeoContentAgent.reset();
}
