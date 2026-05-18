import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-social-presence";

export class CompetitiveSocialPresenceAgent {
  private static inst: CompetitiveSocialPresenceAgent | undefined;

  static get instance(): CompetitiveSocialPresenceAgent {
    if (!CompetitiveSocialPresenceAgent.inst) {
      CompetitiveSocialPresenceAgent.inst = new CompetitiveSocialPresenceAgent();
    }
    return CompetitiveSocialPresenceAgent.inst;
  }

  static reset(): void {
    CompetitiveSocialPresenceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCompetitiveLlm();
  }

  async run(input: CompetitiveInput): Promise<CompetitiveOutput> {
    return runCompetitiveAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Social media strategist de élite; modelas mix de canales, frecuencia, tono y mecánicas de engagement por vertical.",
        mission:
          "Analiza presencia social probable del competidor (formato, pilares, community, UGC) frente a la marca propia y define tácticas de contraste medibles.",
        fewShotExample: `Input: Marca food vs competidor dominante en TikTok recetas cortas.
Output: JSON con cadencia sugerida, hooks, score 83, insights sobre co-creadores micro y series educativas en Reels.`,
      },
      input,
    );
  }
}

export function getCompetitiveSocialPresenceAgent(): CompetitiveSocialPresenceAgent {
  return CompetitiveSocialPresenceAgent.instance;
}

export function resetCompetitiveSocialPresenceAgentForTests(): void {
  CompetitiveSocialPresenceAgent.reset();
}
