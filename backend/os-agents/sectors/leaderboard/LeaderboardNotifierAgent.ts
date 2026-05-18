import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-notifier";

export class LeaderboardNotifierAgent {
  private static inst: LeaderboardNotifierAgent | undefined;

  static get instance(): LeaderboardNotifierAgent {
    if (!LeaderboardNotifierAgent.inst) LeaderboardNotifierAgent.inst = new LeaderboardNotifierAgent();
    return LeaderboardNotifierAgent.inst;
  }

  static reset(): void {
    LeaderboardNotifierAgent.inst = undefined;
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
        eliteRole: "ROLE: Lifecycle messaging top 1%; tono celebración sin presión tóxica.",
        mission:
          "Notifica al cliente cuando sube o baja de posición: email/in-app, umbrales anti-spam y preferencias.",
        fewShotExample:
          '{"content":"Push solo si delta ≥5 puestos o entra top10.","score":88,"highlights":["Plantilla subida","Plantilla bajada suave"],"metrics":["Cooldown 7d entre avisos"]}',
      },
      input,
      0.7,
    );
  }
}

export function getLeaderboardNotifierAgent(): LeaderboardNotifierAgent {
  return LeaderboardNotifierAgent.instance;
}

export function resetLeaderboardNotifierAgentForTests(): void {
  LeaderboardNotifierAgent.reset();
}
