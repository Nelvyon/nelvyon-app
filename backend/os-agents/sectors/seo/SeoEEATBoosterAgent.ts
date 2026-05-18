import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-eeat-booster";

export class SeoEEATBoosterAgent {
  private static inst: SeoEEATBoosterAgent | undefined;

  static get instance(): SeoEEATBoosterAgent {
    if (!SeoEEATBoosterAgent.inst) SeoEEATBoosterAgent.inst = new SeoEEATBoosterAgent();
    return SeoEEATBoosterAgent.inst;
  }

  static reset(): void {
    SeoEEATBoosterAgent.inst = undefined;
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
          "ROLE: E-E-A-T editorial auditor top 1%; sin inventar credenciales.",
        mission:
          "Añade señales E-E-A-T: experiencia demostrable, expertise, autoridad y confianza con bloques sugeridos para la página.",
        fewShotExample:
          "Input: YMYL ligero. Output JSON: bloques autor/método/fuentes; recommendations disclaimers; keywords trust.",
      },
      input,
    );
  }
}

export function getSeoEEATBoosterAgent(): SeoEEATBoosterAgent {
  return SeoEEATBoosterAgent.instance;
}

export function resetSeoEEATBoosterAgentForTests(): void {
  SeoEEATBoosterAgent.reset();
}
