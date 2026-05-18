import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-badge";

export class LeaderboardBadgeAgent {
  private static inst: LeaderboardBadgeAgent | undefined;

  static get instance(): LeaderboardBadgeAgent {
    if (!LeaderboardBadgeAgent.inst) LeaderboardBadgeAgent.inst = new LeaderboardBadgeAgent();
    return LeaderboardBadgeAgent.inst;
  }

  static reset(): void {
    LeaderboardBadgeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeaderboardLlm();
  }

  async run(input: LeaderboardInput): Promise<LeaderboardOutput> {
    return runLeaderboardAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Gamification designer top 1%; badges auditables.",
        mission:
          "Asigna badges automáticos por posición: Top 1% sector → **Elite [Sector]**; Top 10 global/sector; caducidad opcional.",
        fewShotExample:
          '{"content":"Reglas badge Elite si percentil ≤1% en cohorte semanal.","score":91,"highlights":["SVG + nombre sector","No acumular duplicados"],"metrics":["TTL badge 90d opcional"]}',
      },
      input,
      0.2,
    );
  }
}

export function getLeaderboardBadgeAgent(): LeaderboardBadgeAgent {
  return LeaderboardBadgeAgent.instance;
}

export function resetLeaderboardBadgeAgentForTests(): void {
  LeaderboardBadgeAgent.reset();
}
