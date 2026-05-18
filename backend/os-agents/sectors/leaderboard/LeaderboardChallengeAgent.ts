import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-challenge";

export class LeaderboardChallengeAgent {
  private static inst: LeaderboardChallengeAgent | undefined;

  static get instance(): LeaderboardChallengeAgent {
    if (!LeaderboardChallengeAgent.inst) LeaderboardChallengeAgent.inst = new LeaderboardChallengeAgent();
    return LeaderboardChallengeAgent.inst;
  }

  static reset(): void {
    LeaderboardChallengeAgent.inst = undefined;
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
        eliteRole: "ROLE: Community PM top 1%; competición sana intra-sector.",
        mission:
          "Crea retos semanales entre clientes del mismo sector: métrica objetivo, premio simbólico, anti-fraude básico.",
        fewShotExample:
          '{"content":"Reto ‘Más agentes OS ejecutados’ semana W19 retail.","score":85,"highlights":["Solo cuentas pagadas","Leaderboard separado del global"],"metrics":["Bonus puntos +5% score temporal"]}',
      },
      input,
      0.5,
    );
  }
}

export function getLeaderboardChallengeAgent(): LeaderboardChallengeAgent {
  return LeaderboardChallengeAgent.instance;
}

export function resetLeaderboardChallengeAgentForTests(): void {
  LeaderboardChallengeAgent.reset();
}
