import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-battlecard";

export class SuperiorCompetitiveBattlecardAgent {
  private static inst: SuperiorCompetitiveBattlecardAgent | undefined;

  static get instance(): SuperiorCompetitiveBattlecardAgent {
    if (!SuperiorCompetitiveBattlecardAgent.inst) SuperiorCompetitiveBattlecardAgent.inst = new SuperiorCompetitiveBattlecardAgent();
    return SuperiorCompetitiveBattlecardAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitiveBattlecardAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Battlecard** — battlecards de ventas automáticas.";
    const mission =
      "Genera **battlecards por competidor** con objeciones y respuestas; actualización **<2 min** tras cambio; **win rate +20%**.";
    const fewShot =
      '{"content":"Auto battlecards per rival, objections and counters, <2m refresh","score":88,"highlights":["<2m battlecards","+20% win rate"],"metrics":["Win rate lift"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorCompetitiveBattlecardAgent(): SuperiorCompetitiveBattlecardAgent {
  return SuperiorCompetitiveBattlecardAgent.instance;
}

export function resetSuperiorCompetitiveBattlecardAgentForTests(): void {
  SuperiorCompetitiveBattlecardAgent.reset();
}
