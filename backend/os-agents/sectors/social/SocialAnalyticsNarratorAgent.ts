import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-analytics-narrator";

export class SocialAnalyticsNarratorAgent {
  private static inst: SocialAnalyticsNarratorAgent | undefined;

  static get instance(): SocialAnalyticsNarratorAgent {
    if (!SocialAnalyticsNarratorAgent.inst) SocialAnalyticsNarratorAgent.inst = new SocialAnalyticsNarratorAgent();
    return SocialAnalyticsNarratorAgent.inst;
  }

  static reset(): void {
    SocialAnalyticsNarratorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialLlm();
  }

  async run(input: SocialInput): Promise<SocialOutput> {
    return runSocialAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Analytics storytelling ejecutivo top 1%; métricas sin vanity traps.",
        mission:
          "Convierte métricas de engagement en narrativa accionable (usa campaignGoal como proxy de KPIs si no hay datos numéricos).",
        fewShotExample:
          "Input: foco comunidad vs alcance. Output JSON: narrativa semanal; posts bullets ejecutivos; hashtags métricas internas.",
      },
      input,
    );
  }
}

export function getSocialAnalyticsNarratorAgent(): SocialAnalyticsNarratorAgent {
  return SocialAnalyticsNarratorAgent.instance;
}

export function resetSocialAnalyticsNarratorAgentForTests(): void {
  SocialAnalyticsNarratorAgent.reset();
}
