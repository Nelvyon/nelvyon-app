import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-content-gap";

export class SeoContentGapAgent {
  private static inst: SeoContentGapAgent | undefined;

  static get instance(): SeoContentGapAgent {
    if (!SeoContentGapAgent.inst) SeoContentGapAgent.inst = new SeoContentGapAgent();
    return SeoContentGapAgent.inst;
  }

  static reset(): void {
    SeoContentGapAgent.inst = undefined;
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
          "ROLE: Content gap analyst top 1%; hipótesis desde sector + competidores proxy.",
        mission:
          "Detecta gaps de contenido vs competidores listados o inferidos para capturar tráfico nuevo.",
        fewShotExample:
          "Input: tres competidores genéricos sector. Output JSON: temas ausentes; keywords oportunidad; recommendations roadmap.",
      },
      input,
    );
  }
}

export function getSeoContentGapAgent(): SeoContentGapAgent {
  return SeoContentGapAgent.instance;
}

export function resetSeoContentGapAgentForTests(): void {
  SeoContentGapAgent.reset();
}
