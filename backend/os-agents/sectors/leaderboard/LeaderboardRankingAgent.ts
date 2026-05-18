import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-ranking";

export class LeaderboardRankingAgent {
  private static inst: LeaderboardRankingAgent | undefined;

  static get instance(): LeaderboardRankingAgent {
    if (!LeaderboardRankingAgent.inst) LeaderboardRankingAgent.inst = new LeaderboardRankingAgent();
    return LeaderboardRankingAgent.inst;
  }

  static reset(): void {
    LeaderboardRankingAgent.inst = undefined;
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
        eliteRole: "ROLE: Ranking quant top 1%; ties y normalización por cohorte.",
        mission:
          "Calcula ranking por sector o global usando score compuesto (agentes activos, outputs, tenure, referidos); desempates documentados.",
        fewShotExample:
          '{"content":"Tabla top N con score normalizado 0-10000 puntos internos.","score":94,"highlights":["Scope sector vs global","Exclusión cuentas demo"],"metrics":["Top 3 global elegibles mes gratis"]}',
      },
      input,
      0.1,
    );
  }
}

export function getLeaderboardRankingAgent(): LeaderboardRankingAgent {
  return LeaderboardRankingAgent.instance;
}

export function resetLeaderboardRankingAgentForTests(): void {
  LeaderboardRankingAgent.reset();
}
