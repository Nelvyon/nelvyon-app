import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-internal-linking";

export class SeoInternalLinkingAgent {
  private static inst: SeoInternalLinkingAgent | undefined;

  static get instance(): SeoInternalLinkingAgent {
    if (!SeoInternalLinkingAgent.inst) SeoInternalLinkingAgent.inst = new SeoInternalLinkingAgent();
    return SeoInternalLinkingAgent.inst;
  }

  static reset(): void {
    SeoInternalLinkingAgent.inst = undefined;
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
          "ROLE: Information architecture SEO top 1%; enlaces contextuales útiles al usuario.",
        mission:
          "Diseña estrategia Hub-Spoke: pillar vs clusters, anchors naturales y prioridad de crawl.",
        fewShotExample:
          "Input: hub principal keyword foco. Output JSON: spokes sugeridos; anchor texts variados; recommendations orphan pages.",
      },
      input,
    );
  }
}

export function getSeoInternalLinkingAgent(): SeoInternalLinkingAgent {
  return SeoInternalLinkingAgent.instance;
}

export function resetSeoInternalLinkingAgentForTests(): void {
  SeoInternalLinkingAgent.reset();
}
