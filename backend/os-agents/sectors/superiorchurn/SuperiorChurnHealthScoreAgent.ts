import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-healthscore";

export class SuperiorChurnHealthScoreAgent {
  private static inst: SuperiorChurnHealthScoreAgent | undefined;

  static get instance(): SuperiorChurnHealthScoreAgent {
    if (!SuperiorChurnHealthScoreAgent.inst) SuperiorChurnHealthScoreAgent.inst = new SuperiorChurnHealthScoreAgent();
    return SuperiorChurnHealthScoreAgent.inst;
  }

  static reset(): void {
    SuperiorChurnHealthScoreAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn Health Score Engine** — 0-100 en tiempo real.";
    const mission =
      "**Health score 0-100** por cliente, componentes ponderados, **trending up/down**; actualización **<5 min**.";
    const fewShot =
      '{"content":"Health 0-100 weighted components, trend up/down <5m","score":91,"highlights":["<5m refresh","Trend"],"metrics":["Health score"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorChurnHealthScoreAgent(): SuperiorChurnHealthScoreAgent {
  return SuperiorChurnHealthScoreAgent.instance;
}

export function resetSuperiorChurnHealthScoreAgentForTests(): void {
  SuperiorChurnHealthScoreAgent.reset();
}
