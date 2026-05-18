import type { ILlmClient } from "../../LlmClient";
import type { LeaderboardInput, LeaderboardOutput } from "./shared";
import { getDefaultLeaderboardLlm, runLeaderboardAgentCore } from "./shared";

const AGENT_ID = "leaderboard-public-page";

export class LeaderboardPublicPageAgent {
  private static inst: LeaderboardPublicPageAgent | undefined;

  static get instance(): LeaderboardPublicPageAgent {
    if (!LeaderboardPublicPageAgent.inst) LeaderboardPublicPageAgent.inst = new LeaderboardPublicPageAgent();
    return LeaderboardPublicPageAgent.inst;
  }

  static reset(): void {
    LeaderboardPublicPageAgent.inst = undefined;
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
        eliteRole: "ROLE: Public web PM top 1%; SEO y privacidad por diseño.",
        mission:
          "Genera spec de página pública de rankings por sector solo para usuarios opt-in; ocultar PII; tabla top N + última actualización.",
        fewShotExample:
          '{"content":"/leaderboard/retail muestra top20 nick público o inicial.","score":87,"highlights":["Meta noindex si sector vacío","JSON-LD FAQ opcional"],"metrics":["TTL cache 5 min"]}',
      },
      input,
      0.5,
    );
  }
}

export function getLeaderboardPublicPageAgent(): LeaderboardPublicPageAgent {
  return LeaderboardPublicPageAgent.instance;
}

export function resetLeaderboardPublicPageAgentForTests(): void {
  LeaderboardPublicPageAgent.reset();
}
