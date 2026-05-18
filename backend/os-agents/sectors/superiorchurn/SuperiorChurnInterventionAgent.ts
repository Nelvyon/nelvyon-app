import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-intervention";

export class SuperiorChurnInterventionAgent {
  private static inst: SuperiorChurnInterventionAgent | undefined;

  static get instance(): SuperiorChurnInterventionAgent {
    if (!SuperiorChurnInterventionAgent.inst) SuperiorChurnInterventionAgent.inst = new SuperiorChurnInterventionAgent();
    return SuperiorChurnInterventionAgent.inst;
  }

  static reset(): void {
    SuperiorChurnInterventionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn Auto-Intervention Orchestrator** — CSM, descuento, tour.";
    const mission =
      "Intervenciones automáticas: **alerta CSM**, **descuento trigger**, **feature tour**; ejecución **<15 min** tras señal crítica.";
    const fewShot =
      '{"content":"CSM alert + discount trigger + feature tour <15m","score":88,"highlights":["<15m intervention","CSM alert"],"metrics":["Interventions"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorChurnInterventionAgent(): SuperiorChurnInterventionAgent {
  return SuperiorChurnInterventionAgent.instance;
}

export function resetSuperiorChurnInterventionAgentForTests(): void {
  SuperiorChurnInterventionAgent.reset();
}
