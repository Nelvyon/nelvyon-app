import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-aprendizaje";

let inst: OptimizadorAprendizajeAgent | null = null;

export class OptimizadorAprendizajeAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorAprendizajeAgent {
    if (!inst) inst = new OptimizadorAprendizajeAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador Aprendizaje** — memoria acumulativa por sector y arquetipo cliente.";
    const mission =
      "Sintetiza **aprendizaje acumulativo** (patrones sector, tipo de cliente, políticas reutilizables, anti-overfit).";
    const fewShot =
      '{"result":"Playbook sector retail: 6 heurísticas validadas","score":91,"recommendations":["Versionar políticas","Drift check","Human-in-loop legal"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorAprendizajeAgent(): OptimizadorAprendizajeAgent {
  return OptimizadorAprendizajeAgent.instance();
}

export function resetOptimizadorAprendizajeAgentForTests(): void {
  inst = null;
}
