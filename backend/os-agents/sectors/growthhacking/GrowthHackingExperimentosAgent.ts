import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-experimentos";

let inst: GrowthHackingExperimentosAgent | null = null;

export class GrowthHackingExperimentosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingExperimentosAgent {
    if (!inst) inst = new GrowthHackingExperimentosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Experimentos** — sprints de 2 semanas con guardrails.";
    const mission =
      "Diseña **backlog de experimentos** (hipótesis, diseño, métrica north-star, criterio de parada, riesgo reputacional).";
    const fewShot =
      '{"result":"Sprint 2w: 4 tests priorizados + 1 kill metric","score":87,"recommendations":["Un cambio principal","Documentar aprendizaje","No manipular métricas vanidad"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingExperimentosAgent(): GrowthHackingExperimentosAgent {
  return GrowthHackingExperimentosAgent.instance();
}

export function resetGrowthHackingExperimentosAgentForTests(): void {
  inst = null;
}
