import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-content-calendar";

export class SocialContentCalendarAgent {
  private static inst: SocialContentCalendarAgent | undefined;

  static get instance(): SocialContentCalendarAgent {
    if (!SocialContentCalendarAgent.inst) SocialContentCalendarAgent.inst = new SocialContentCalendarAgent();
    return SocialContentCalendarAgent.inst;
  }

  static reset(): void {
    SocialContentCalendarAgent.inst = undefined;
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
          "ROLE: Head of social editorial top 1%; calendarios realistas con cadencia y fatiga controlada.",
        mission:
          "Genera calendario editorial mensual por plataforma: fecha relativa, formato, tema, CTA y KPI sugerido.",
        fewShotExample:
          "Input: IG + TikTok retail. Output JSON: posts por semana; hashtags por pilar; content tabla guía.",
      },
      input,
    );
  }
}

export function getSocialContentCalendarAgent(): SocialContentCalendarAgent {
  return SocialContentCalendarAgent.instance;
}

export function resetSocialContentCalendarAgentForTests(): void {
  SocialContentCalendarAgent.reset();
}
