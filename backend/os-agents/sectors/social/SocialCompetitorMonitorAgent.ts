import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-competitor-monitor";

export class SocialCompetitorMonitorAgent {
  private static inst: SocialCompetitorMonitorAgent | undefined;

  static get instance(): SocialCompetitorMonitorAgent {
    if (!SocialCompetitorMonitorAgent.inst) SocialCompetitorMonitorAgent.inst = new SocialCompetitorMonitorAgent();
    return SocialCompetitorMonitorAgent.inst;
  }

  static reset(): void {
    SocialCompetitorMonitorAgent.inst = undefined;
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
          "ROLE: Competitive social intel top 1%; inferencia desde sector sin inventar handles.",
        mission:
          "Analiza contenido competidor hipotético del sector y detecta gaps de formato, mensaje y posting windows.",
        fewShotExample:
          "Input: sector beauty DTC. Output JSON: oportunidades reels educativos; posts ideas piloto; hashtags gap.",
      },
      input,
    );
  }
}

export function getSocialCompetitorMonitorAgent(): SocialCompetitorMonitorAgent {
  return SocialCompetitorMonitorAgent.instance;
}

export function resetSocialCompetitorMonitorAgentForTests(): void {
  SocialCompetitorMonitorAgent.reset();
}
