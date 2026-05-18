import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-canales";

let inst: OptimizadorCanalesAgent | null = null;

export class OptimizadorCanalesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorCanalesAgent {
    if (!inst) inst = new OptimizadorCanalesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador Canales** — mix de inversión por performance.";
    const mission =
      "Diseña **redistribución entre canales** (atribución, saturación marginal, correlaciones y riesgo concentración).";
    const fewShot =
      '{"result":"Shift 8% a canal B por ROAS marginal","score":89,"recommendations":["Tope single-channel","Ventana atribución","Test holdout"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorCanalesAgent(): OptimizadorCanalesAgent {
  return OptimizadorCanalesAgent.instance();
}

export function resetOptimizadorCanalesAgentForTests(): void {
  inst = null;
}
