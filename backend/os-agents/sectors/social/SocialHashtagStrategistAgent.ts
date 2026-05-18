import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-hashtag-strategist";

export class SocialHashtagStrategistAgent {
  private static inst: SocialHashtagStrategistAgent | undefined;

  static get instance(): SocialHashtagStrategistAgent {
    if (!SocialHashtagStrategistAgent.inst) SocialHashtagStrategistAgent.inst = new SocialHashtagStrategistAgent();
    return SocialHashtagStrategistAgent.inst;
  }

  static reset(): void {
    SocialHashtagStrategistAgent.inst = undefined;
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
          "ROLE: Growth social SEO top 1%; clusters de hashtags sin stuffing ni bans obvios.",
        mission:
          "Estrategia de hashtags con volumen relativo y competencia estimada cualitativa (alta/media/baja).",
        fewShotExample:
          "Input: nicho yoga urbano. Output JSON: sets por objetivo alcance vs nicho; posts con guía de uso.",
      },
      input,
    );
  }
}

export function getSocialHashtagStrategistAgent(): SocialHashtagStrategistAgent {
  return SocialHashtagStrategistAgent.instance;
}

export function resetSocialHashtagStrategistAgentForTests(): void {
  SocialHashtagStrategistAgent.reset();
}
