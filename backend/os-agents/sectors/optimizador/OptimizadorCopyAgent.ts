import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-copy";

let inst: OptimizadorCopyAgent | null = null;

export class OptimizadorCopyAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorCopyAgent {
    if (!inst) inst = new OptimizadorCopyAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador Copy** — reescritura bajo umbral de CTR.";
    const mission =
      "Genera **variantes de copy** cuando CTR cae bajo umbral (tono marca, claims permitidos, pruebas incrementales).";
    const fewShot =
      '{"result":"Pack 5 headlines + 3 CTAs post-umbral CTR","score":86,"recommendations":["Disclaimer sector","Test A/B ligado","Evitar clickbait"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorCopyAgent(): OptimizadorCopyAgent {
  return OptimizadorCopyAgent.instance();
}

export function resetOptimizadorCopyAgentForTests(): void {
  inst = null;
}
