import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-viral";

export class LeaderboardViralAgent {
  private static inst: LeaderboardViralAgent | undefined;

  static get instance(): LeaderboardViralAgent {
    if (!LeaderboardViralAgent.inst) LeaderboardViralAgent.inst = new LeaderboardViralAgent();
    return LeaderboardViralAgent.inst;
  }

  static reset(): void {
    LeaderboardViralAgent.inst = undefined;
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
        eliteRole: "ROLE: Social growth copy top 1%; share orgulloso sin datos sensibles.",
        mission:
          "Genera contenido shareable: ‘Estoy #N en [sector]’ con gráfico placeholder, solo si opt-in público; link deep a perfil.",
        fewShotExample:
          '{"content":"Carrusel 3 slides: posición, badge Elite, CTA probar NELVYON.","score":86,"highlights":["Ocultar MRR/PII","OG estático generado"],"metrics":["UTM share=leaderboard_viral"]}',
      },
      input,
      0.7,
    );
  }
}

export function getLeaderboardViralAgent(): LeaderboardViralAgent {
  return LeaderboardViralAgent.instance;
}

export function resetLeaderboardViralAgentForTests(): void {
  LeaderboardViralAgent.reset();
}
