import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-anuncios";

let inst: OptimizadorAnunciosAgent | null = null;

export class OptimizadorAnunciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorAnunciosAgent {
    if (!inst) inst = new OptimizadorAnunciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador Anuncios** — pausa/activación por señales de rendimiento.";
    const mission =
      "Propón **pausar o reactivar anuncios** (CTR, CPA, volumen, estacionalidad, cooldown anti-ruido).";
    const fewShot =
      '{"result":"Matriz anuncios: pausar 12%, reactivar 3%","score":87,"recommendations":["Cooldown 24h","Excepciones brand","Auditoría overlap"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorAnunciosAgent(): OptimizadorAnunciosAgent {
  return OptimizadorAnunciosAgent.instance();
}

export function resetOptimizadorAnunciosAgentForTests(): void {
  inst = null;
}
