import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-winback";

export class SuperiorChurnWinbackAgent {
  private static inst: SuperiorChurnWinbackAgent | undefined;

  static get instance(): SuperiorChurnWinbackAgent {
    if (!SuperiorChurnWinbackAgent.inst) SuperiorChurnWinbackAgent.inst = new SuperiorChurnWinbackAgent();
    return SuperiorChurnWinbackAgent.inst;
  }

  static reset(): void {
    SuperiorChurnWinbackAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn Win-Back Campaign Lead** — clientes perdidos <90d.";
    const mission =
      "Campañas **win-back** para clientes perdidos: **timing óptimo**, **incentivos por LTV**; win-back **>25%** <90d.";
    const fewShot =
      '{"content":"Win-back cadence, LTV-based incentive, >25% rate","score":87,"highlights":[">25% win-back","LTV incentive"],"metrics":["Win-back rate"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorChurnWinbackAgent(): SuperiorChurnWinbackAgent {
  return SuperiorChurnWinbackAgent.instance;
}

export function resetSuperiorChurnWinbackAgentForTests(): void {
  SuperiorChurnWinbackAgent.reset();
}
