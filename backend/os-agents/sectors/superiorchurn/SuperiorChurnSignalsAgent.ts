import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-signals";

export class SuperiorChurnSignalsAgent {
  private static inst: SuperiorChurnSignalsAgent | undefined;

  static get instance(): SuperiorChurnSignalsAgent {
    if (!SuperiorChurnSignalsAgent.inst) SuperiorChurnSignalsAgent.inst = new SuperiorChurnSignalsAgent();
    return SuperiorChurnSignalsAgent.inst;
  }

  static reset(): void {
    SuperiorChurnSignalsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn Early Signals Detector** — señales tempranas.";
    const mission =
      "Detecta **señales tempranas**: login drop, feature abandonment, soporte frecuente; dispara intervención **<15 min** si crítico.";
    const fewShot =
      '{"content":"Login drop + feature abandon + support spike flagged","score":90,"highlights":["Early signals","<15m trigger"],"metrics":["Signal count"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorChurnSignalsAgent(): SuperiorChurnSignalsAgent {
  return SuperiorChurnSignalsAgent.instance;
}

export function resetSuperiorChurnSignalsAgentForTests(): void {
  SuperiorChurnSignalsAgent.reset();
}
