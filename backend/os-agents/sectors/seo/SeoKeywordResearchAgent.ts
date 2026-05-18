import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-keyword-research";

export class SeoKeywordResearchAgent {
  private static inst: SeoKeywordResearchAgent | undefined;

  static get instance(): SeoKeywordResearchAgent {
    if (!SeoKeywordResearchAgent.inst) SeoKeywordResearchAgent.inst = new SeoKeywordResearchAgent();
    return SeoKeywordResearchAgent.inst;
  }

  static reset(): void {
    SeoKeywordResearchAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeoLlm();
  }

  async run(input: SeoInput): Promise<SeoOutput> {
    return runSeoAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: SEO strategist técnico top 1%; clustering por intención sin inventar datos Search Console.",
        mission:
          "Investiga keywords primarias y long-tail por sector y audiencia; agrupa por intención informacional/transaccional.",
        fewShotExample:
          "Input: keyword semilla software facturación. Output JSON: clusters + modificadores long-tail; recommendations prioridad.",
      },
      input,
    );
  }
}

export function getSeoKeywordResearchAgent(): SeoKeywordResearchAgent {
  return SeoKeywordResearchAgent.instance;
}

export function resetSeoKeywordResearchAgentForTests(): void {
  SeoKeywordResearchAgent.reset();
}
