import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-achievement-copy";

export class BadgesAchievementCopyAgent {
  private static inst: BadgesAchievementCopyAgent | undefined;

  static get instance(): BadgesAchievementCopyAgent {
    if (!BadgesAchievementCopyAgent.inst) BadgesAchievementCopyAgent.inst = new BadgesAchievementCopyAgent();
    return BadgesAchievementCopyAgent.inst;
  }

  static reset(): void {
    BadgesAchievementCopyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBadgesLlm();
  }

  async run(input: BadgesInput): Promise<BadgesOutput> {
    return runBadgesAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Achievement copywriter top 1%; nombres memorables y descripciones que motivan sin manipular.",
        mission:
          "Redacta nombres y descripciones motivadoras para cada badge; tono coherente con marca y sector.",
        fewShotExample:
          "Input: fitness. Output JSON: badges 'Primera semana imparable'; milestones desbloqueo streak 7.",
      },
      input,
      0.5,
    );
  }
}

export function getBadgesAchievementCopyAgent(): BadgesAchievementCopyAgent {
  return BadgesAchievementCopyAgent.instance;
}

export function resetBadgesAchievementCopyAgentForTests(): void {
  BadgesAchievementCopyAgent.reset();
}
