import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-campanas";

let inst: OptimizadorCampanasAgent | null = null;

export class OptimizadorCampanasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorCampanasAgent {
    if (!inst) inst = new OptimizadorCampanasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador Campañas** — orquestación autónoma multicanal.";
    const mission =
      "Orquesta **optimización continua** de campañas activas (priorización, conflictos creativos, calendario, guardrails).";
    const fewShot =
      '{"result":"Plan 7d campañas activas con prioridades","score":88,"recommendations":["Congelar overlap","Sincronizar presupuesto","QA compliance creativos"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorCampanasAgent(): OptimizadorCampanasAgent {
  return OptimizadorCampanasAgent.instance();
}

export function resetOptimizadorCampanasAgentForTests(): void {
  inst = null;
}
