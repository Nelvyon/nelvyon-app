import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-seo";

export class SuperiorLandingPageSEOAgent {
  private static inst: SuperiorLandingPageSEOAgent | undefined;

  static get instance(): SuperiorLandingPageSEOAgent {
    if (!SuperiorLandingPageSEOAgent.inst) SuperiorLandingPageSEOAgent.inst = new SuperiorLandingPageSEOAgent();
    return SuperiorLandingPageSEOAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPageSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage SEO** — SEO on-page y velocidad.";
    const mission =
      "Optimiza **SEO on-page**, schema markup, meta tags y velocidad sin sacrificar **LCP <1s**.";
    const fewShot =
      '{"content":"On-page SEO schema meta tags speed optimization LCP <1s","score":88,"highlights":["Schema markup","LCP <1s"],"metrics":["On-page SEO score"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorLandingPageSEOAgent(): SuperiorLandingPageSEOAgent {
  return SuperiorLandingPageSEOAgent.instance;
}

export function resetSuperiorLandingPageSEOAgentForTests(): void {
  SuperiorLandingPageSEOAgent.reset();
}
