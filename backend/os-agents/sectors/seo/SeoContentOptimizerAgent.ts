import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-content-optimizer";

export class SeoContentOptimizerAgent {
  private static inst: SeoContentOptimizerAgent | undefined;

  static get instance(): SeoContentOptimizerAgent {
    if (!SeoContentOptimizerAgent.inst) SeoContentOptimizerAgent.inst = new SeoContentOptimizerAgent();
    return SeoContentOptimizerAgent.inst;
  }

  static reset(): void {
    SeoContentOptimizerAgent.inst = undefined;
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
          "ROLE: Editor SEO senior top 1%; densidad natural y sinónimos semánticos.",
        mission:
          "Optimiza contenido existente para posicionar la keyword foco sin keyword stuffing; propone reapuntado H2/H3.",
        fewShotExample:
          "Input: artículo largo con keyword repetida. Output JSON: mapa de sinónimos; recommendations parrafos a fusionar.",
      },
      input,
    );
  }
}

export function getSeoContentOptimizerAgent(): SeoContentOptimizerAgent {
  return SeoContentOptimizerAgent.instance;
}

export function resetSeoContentOptimizerAgentForTests(): void {
  SeoContentOptimizerAgent.reset();
}
