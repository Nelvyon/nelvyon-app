import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-reportes";

let inst: AutoprocesosReportesAgent | null = null;

export class AutoprocesosReportesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosReportesAgent {
    if (!inst) inst = new AutoprocesosReportesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Reportes** — dashboards internos vivos.";
    const mission =
      "Define **reportes automáticos** (KPIs, cadencia, fuentes, freshness, narrativa ejecutiva, alertas ligadas).";
    const fewShot =
      '{"result":"Spec reporte semanal ops","score":88,"recommendations":["Single source of truth","Drill-down","Export CSV"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosReportesAgent(): AutoprocesosReportesAgent {
  return AutoprocesosReportesAgent.instance();
}

export function resetAutoprocesosReportesAgentForTests(): void {
  inst = null;
}
