import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-reportes";

let inst: InvestigadorReportesAgent | null = null;

export class InvestigadorReportesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorReportesAgent {
    if (!inst) inst = new InvestigadorReportesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Reportes** — inteligencia competitiva semanal.";
    const mission =
      "Redacta **brief semanal** (deltas, alertas, fuentes, confianza, próximos pasos, riesgos regulatorios).";
    const fewShot =
      '{"result":"Intel week: 3 movimientos rival + 2 alertas","score":85,"recommendations":["Anexo fuentes","Owner acción","Umbral alerta precio"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorReportesAgent(): InvestigadorReportesAgent {
  return InvestigadorReportesAgent.instance();
}

export function resetInvestigadorReportesAgentForTests(): void {
  inst = null;
}
