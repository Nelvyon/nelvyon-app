import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-facturas";

let inst: AutoprocesosFacturasAgent | null = null;

export class AutoprocesosFacturasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosFacturasAgent {
    if (!inst) inst = new AutoprocesosFacturasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Facturas** — ciclo AP/AR sin fricción.";
    const mission =
      "Automatiza **facturas** (ingesta, matching PO, aprobaciones, registro contable placeholder, archivado).";
    const fewShot =
      '{"result":"Flujo factura proveedor","score":88,"recommendations":["OCR+validación humano","Duplicados","Retención legal"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosFacturasAgent(): AutoprocesosFacturasAgent {
  return AutoprocesosFacturasAgent.instance();
}

export function resetAutoprocesosFacturasAgentForTests(): void {
  inst = null;
}
