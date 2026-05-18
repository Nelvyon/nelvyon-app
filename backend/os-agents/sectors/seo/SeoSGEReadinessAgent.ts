import type { ILlmClient } from "../../LlmClient";
import type { SeoInput, SeoOutput } from "./shared";
import { getDefaultSeoLlm, runSeoAgentCore } from "./shared";

const AGENT_ID = "seo-sge-readiness";

export class SeoSGEReadinessAgent {
  private static inst: SeoSGEReadinessAgent | undefined;

  static get instance(): SeoSGEReadinessAgent {
    if (!SeoSGEReadinessAgent.inst) SeoSGEReadinessAgent.inst = new SeoSGEReadinessAgent();
    return SeoSGEReadinessAgent.inst;
  }

  static reset(): void {
    SeoSGEReadinessAgent.inst = undefined;
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
          "ROLE: AI-search readiness analyst top 1%; formato citeable y respuestas concisas.",
        mission:
          "Optimiza contenido para AI Overviews / motores de respuesta: definiciones claras, listas, FAQs citables y límites de claims.",
        fewShotExample:
          "Input: página definición + pasos. Output JSON: bullet extractivo; recommendations fragmentos citables; keywords entidad.",
      },
      input,
    );
  }
}

export function getSeoSGEReadinessAgent(): SeoSGEReadinessAgent {
  return SeoSGEReadinessAgent.instance;
}

export function resetSeoSGEReadinessAgentForTests(): void {
  SeoSGEReadinessAgent.reset();
}
