import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-presupuesto";

let inst: OptimizadorPresupuestoAgent | null = null;

export class OptimizadorPresupuestoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorPresupuestoAgent {
    if (!inst) inst = new OptimizadorPresupuestoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador Presupuesto** — ROI en tiempo real con límites duros.";
    const mission =
      "Define **reasignación de presupuesto** por ROAS/ROI (pacing diario, caps, rollback si cae eficiencia).";
    const fewShot =
      '{"result":"Rebalance Meta/Google 60/40 con caps","score":90,"recommendations":["Floor spend brand","Alerta drawdown","Congelar si CPA>umbral"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorPresupuestoAgent(): OptimizadorPresupuestoAgent {
  return OptimizadorPresupuestoAgent.instance();
}

export function resetOptimizadorPresupuestoAgentForTests(): void {
  inst = null;
}
