import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-snapshot";

export class LeaderboardSnapshotAgent {
  private static inst: LeaderboardSnapshotAgent | undefined;

  static get instance(): LeaderboardSnapshotAgent {
    if (!LeaderboardSnapshotAgent.inst) LeaderboardSnapshotAgent.inst = new LeaderboardSnapshotAgent();
    return LeaderboardSnapshotAgent.inst;
  }

  static reset(): void {
    LeaderboardSnapshotAgent.inst = undefined;
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
        eliteRole: "ROLE: Data engineer top 1%; snapshots inmutables para histórico.",
        mission:
          "Define persistencia en leaderboard_rankings (userId, sector, posicion, score, semana) en snapshot semanal **lunes 00:00 UTC**.",
        fewShotExample:
          '{"content":"Row por usuario-sector-semana; score decimal con 2 decimales.","score":93,"highlights":["PK lógica uuid","No UPDATE in-place; nueva fila por semana"],"metrics":["Retención 52 semanas hot"]}',
      },
      input,
      0.1,
    );
  }
}

export function getLeaderboardSnapshotAgent(): LeaderboardSnapshotAgent {
  return LeaderboardSnapshotAgent.instance;
}

export function resetLeaderboardSnapshotAgentForTests(): void {
  LeaderboardSnapshotAgent.reset();
}
