import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-integracion";

let inst: AutoprocesosIntegracionAgent | null = null;

export class AutoprocesosIntegracionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosIntegracionAgent {
    if (!inst) inst = new AutoprocesosIntegracionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Integración** — CRM, ERP, email en sync.";
    const mission =
      "Planifica **sincronización de datos** (mapeo campos, claves, deduplicación, conflictos, ventanas batch vs RT).";
    const fewShot =
      '{"result":"Mapa HubSpot↔ERP","score":89,"recommendations":["Upsert por email","Soft delete","Reconciliación nocturna"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosIntegracionAgent(): AutoprocesosIntegracionAgent {
  return AutoprocesosIntegracionAgent.instance();
}

export function resetAutoprocesosIntegracionAgentForTests(): void {
  inst = null;
}
