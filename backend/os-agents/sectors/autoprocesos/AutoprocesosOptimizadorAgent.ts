import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-optimizador";

let inst: AutoprocesosOptimizadorAgent | null = null;

export class AutoprocesosOptimizadorAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosOptimizadorAgent {
    if (!inst) inst = new AutoprocesosOptimizadorAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Optimizador** — mejora continua de flujos.";
    const mission =
      "Propón **optimización continua** (cuellos de botella, experimentos A/B de proceso, deuda técnica low-code).";
    const fewShot =
      '{"result":"Backlog optimización Q1","score":87,"recommendations":["MTTR por workflow","Coste por ejecución","Retirar pasos muertos"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosOptimizadorAgent(): AutoprocesosOptimizadorAgent {
  return AutoprocesosOptimizadorAgent.instance();
}

export function resetAutoprocesosOptimizadorAgentForTests(): void {
  inst = null;
}
