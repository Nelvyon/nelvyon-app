import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-dashboard";

export class ObservabilityDashboardAgent {
  private static inst: ObservabilityDashboardAgent | undefined;

  static get instance(): ObservabilityDashboardAgent {
    if (!ObservabilityDashboardAgent.inst) ObservabilityDashboardAgent.inst = new ObservabilityDashboardAgent();
    return ObservabilityDashboardAgent.inst;
  }

  static reset(): void {
    ObservabilityDashboardAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability Health Dashboard Designer** — vista tiempo real de salud del sistema.";
    const mission =
      "Genera **vista de salud en tiempo real**: uptime, latencia p95, error rate, coste acumulado y estado de alertas activas.";
    const fewShot =
      '{"content":"Live health tiles uptime p95 errors cost","score":90,"highlights":["Real-time","Uptime 99.9%"],"metrics":["Health score"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getObservabilityDashboardAgent(): ObservabilityDashboardAgent {
  return ObservabilityDashboardAgent.instance;
}

export function resetObservabilityDashboardAgentForTests(): void {
  ObservabilityDashboardAgent.reset();
}
