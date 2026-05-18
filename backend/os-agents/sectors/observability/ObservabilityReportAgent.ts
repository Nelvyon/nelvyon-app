import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-report";

export class ObservabilityReportAgent {
  private static inst: ObservabilityReportAgent | undefined;

  static get instance(): ObservabilityReportAgent {
    if (!ObservabilityReportAgent.inst) ObservabilityReportAgent.inst = new ObservabilityReportAgent();
    return ObservabilityReportAgent.inst;
  }

  static reset(): void {
    ObservabilityReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability Weekly Health Reporter** — informe ejecutivo de salud del sistema.";
    const mission =
      "Genera **reporte semanal automático** de salud: SLOs, incidentes, coste LLM, top agentes por latencia/error y tendencias.";
    const fewShot =
      '{"content":"Weekly health report SLOs incidents cost trends","score":90,"highlights":["Weekly auto","SLO summary"],"metrics":["Uptime"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getObservabilityReportAgent(): ObservabilityReportAgent {
  return ObservabilityReportAgent.instance;
}

export function resetObservabilityReportAgentForTests(): void {
  ObservabilityReportAgent.reset();
}
