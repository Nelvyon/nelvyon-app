import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-schema-markup";

export class SeoSchemaMarkupAgent {
  private static inst: SeoSchemaMarkupAgent | undefined;

  static get instance(): SeoSchemaMarkupAgent {
    if (!SeoSchemaMarkupAgent.inst) SeoSchemaMarkupAgent.inst = new SeoSchemaMarkupAgent();
    return SeoSchemaMarkupAgent.inst;
  }

  static reset(): void {
    SeoSchemaMarkupAgent.inst = undefined;
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
          "ROLE: Structured data engineer SEO top 1%; JSON-LD válido conceptualmente.",
        mission:
          "Genera schema markup JSON-LD para rich snippets (FAQ, Article, HowTo) según tipo de página inferido.",
        fewShotExample:
          "Input: guía how-to. Output JSON: bloque script-LD en content; keywords tipos schema; recommendations validación.",
      },
      input,
    );
  }
}

export function getSeoSchemaMarkupAgent(): SeoSchemaMarkupAgent {
  return SeoSchemaMarkupAgent.instance;
}

export function resetSeoSchemaMarkupAgentForTests(): void {
  SeoSchemaMarkupAgent.reset();
}
