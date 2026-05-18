import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-leaderboard";

export class BadgesLeaderboardAgent {
  private static inst: BadgesLeaderboardAgent | undefined;

  static get instance(): BadgesLeaderboardAgent {
    if (!BadgesLeaderboardAgent.inst) BadgesLeaderboardAgent.inst = new BadgesLeaderboardAgent();
    return BadgesLeaderboardAgent.inst;
  }

  static reset(): void {
    BadgesLeaderboardAgent.inst = undefined;
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
          "ROLE: Competitive social systems designer top 1%; fair play y privacidad.",
        mission:
          "Diseña sistema de clasificación y competición: temporadas, segmentos, anti-cheat y reglas de desempate.",
        fewShotExample:
          "Input: comunidad dev. Output JSON: badges temporada; milestones ranking semanal.",
      },
      input,
      0.2,
    );
  }
}

export function getBadgesLeaderboardAgent(): BadgesLeaderboardAgent {
  return BadgesLeaderboardAgent.instance;
}

export function resetBadgesLeaderboardAgentForTests(): void {
  BadgesLeaderboardAgent.reset();
}
