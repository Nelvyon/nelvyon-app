import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-title-meta";

export class SeoTitleMetaAgent {
  private static inst: SeoTitleMetaAgent | undefined;

  static get instance(): SeoTitleMetaAgent {
    if (!SeoTitleMetaAgent.inst) SeoTitleMetaAgent.inst = new SeoTitleMetaAgent();
    return SeoTitleMetaAgent.inst;
  }

  static reset(): void {
    SeoTitleMetaAgent.inst = undefined;
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
          "ROLE: SERP snippet optimizer top 1%; CTR sin clickbait ilegal ni promesas falsas.",
        mission:
          "Genera H1 sugerido + meta title + meta description optimizados con límites de caracteres orientativos.",
        fewShotExample:
          "Input: página servicio local. Output JSON: 3 variantes title/meta; keywords secundarias en lista.",
      },
      input,
    );
  }
}

export function getSeoTitleMetaAgent(): SeoTitleMetaAgent {
  return SeoTitleMetaAgent.instance;
}

export function resetSeoTitleMetaAgentForTests(): void {
  SeoTitleMetaAgent.reset();
}
