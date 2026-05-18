import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-leaderboard";

export class AgencyCertLeaderboardAgent {
  private static inst: AgencyCertLeaderboardAgent | undefined;

  static get instance(): AgencyCertLeaderboardAgent {
    if (!AgencyCertLeaderboardAgent.inst) AgencyCertLeaderboardAgent.inst = new AgencyCertLeaderboardAgent();
    return AgencyCertLeaderboardAgent.inst;
  }

  static reset(): void {
    AgencyCertLeaderboardAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgencyCertLlm();
  }

  async run(input: AgencyCertInput): Promise<AgencyCertOutput> {
    return runAgencyCertAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Partner leaderboard; país + score resultados.",
        mission:
          "Ranking de agencias certificadas por **país** y **resultados** (revenue proxy, retención clientes, NPS agencia).",
        fewShotExample:
          '{"content":"Top ES: 3 Platinum, MRR agregado.","score":86,"highlights":["Por país","Fair ties"],"metrics":["Posición 4"]}',
      },
      input,
      0.4,
    );
  }
}

export function getAgencyCertLeaderboardAgent(): AgencyCertLeaderboardAgent {
  return AgencyCertLeaderboardAgent.instance;
}

export function resetAgencyCertLeaderboardAgentForTests(): void {
  AgencyCertLeaderboardAgent.reset();
}
