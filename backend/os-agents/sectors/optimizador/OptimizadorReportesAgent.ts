import type { ILlmClient } from "../../LlmClient";
import type { OptimizadorInput, OptimizadorOutput } from "./shared";
import { getDefaultOptimizadorLlm, runOptimizadorAgentCore } from "./shared";

const AGENT_ID = "optimizador-reportes";

let inst: OptimizadorReportesAgent | null = null;

export class OptimizadorReportesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): OptimizadorReportesAgent {
    if (!inst) inst = new OptimizadorReportesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOptimizadorLlm();
  }

  async run(input: OptimizadorInput): Promise<OptimizadorOutput> {
    const eliteRole = "Eres **Optimizador Reportes** — resumen semanal ejecutivo de optimización.";
    const mission =
      "Produce **reporte semanal automático** (deltas KPI, acciones tomadas, riesgos, backlog próxima semana).";
    const fewShot =
      '{"result":"Weekly OS: ROAS +6%, 14 acciones auto","score":84,"recommendations":["Anexar experimentos","Riesgos compliance","Forecast spend"]}';
    return runOptimizadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getOptimizadorReportesAgent(): OptimizadorReportesAgent {
  return OptimizadorReportesAgent.instance();
}

export function resetOptimizadorReportesAgentForTests(): void {
  inst = null;
}
