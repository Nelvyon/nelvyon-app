import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-reward";

export class LeaderboardRewardAgent {
  private static inst: LeaderboardRewardAgent | undefined;

  static get instance(): LeaderboardRewardAgent {
    if (!LeaderboardRewardAgent.inst) LeaderboardRewardAgent.inst = new LeaderboardRewardAgent();
    return LeaderboardRewardAgent.inst;
  }

  static reset(): void {
    LeaderboardRewardAgent.inst = undefined;
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
        eliteRole: "ROLE: RevOps top 1%; recompensas idempotentes en Stripe/billing interno.",
        mission:
          "Aplica recompensas automáticas a top: descuentos/créditos; **top 3 global = mes gratis**; límites y flags anti-doble canje.",
        fewShotExample:
          '{"content":"Job semanal aplica crédito tras snapshot lunes 00:00 UTC.","score":92,"highlights":["Idempotency por semana+user","Top3 global 100% desc mes"],"metrics":["Tope crédito € si plan anual"]}',
      },
      input,
      0.2,
    );
  }
}

export function getLeaderboardRewardAgent(): LeaderboardRewardAgent {
  return LeaderboardRewardAgent.instance;
}

export function resetLeaderboardRewardAgentForTests(): void {
  LeaderboardRewardAgent.reset();
}
