import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-abtest";

let inst: OptimizadorAbTestAgent | null = null;

export class OptimizadorAbTestAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorAbTestAgent {
    if (!inst) inst = new OptimizadorAbTestAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador A/B Test** — experimentación continua sin fricción humana.";
    const mission =
      "Define **A/B tests continuos** (diseño, tamaño muestra, parada temprana, guardrails de negocio).";
    const fewShot =
      '{"result":"Cola experimentos 14d con parada bayesiana","score":85,"recommendations":["Mínimo n por celda","No pisar promos","Log de decisiones"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorAbTestAgent(): OptimizadorAbTestAgent {
  return OptimizadorAbTestAgent.instance();
}

export function resetOptimizadorAbTestAgentForTests(): void {
  inst = null;
}
