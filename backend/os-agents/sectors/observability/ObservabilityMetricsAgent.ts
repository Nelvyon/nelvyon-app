import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-metrics";

export class ObservabilityMetricsAgent {
  private static inst: ObservabilityMetricsAgent | undefined;

  static get instance(): ObservabilityMetricsAgent {
    if (!ObservabilityMetricsAgent.inst) ObservabilityMetricsAgent.inst = new ObservabilityMetricsAgent();
    return ObservabilityMetricsAgent.inst;
  }

  static reset(): void {
    ObservabilityMetricsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability Metrics Engineer** — percentiles, error rate y throughput.";
    const mission =
      "Expone **métricas**: **p50/p95/p99 latencia**, **error rate**, **throughput**; agregados 12 meses y SLO error <0.5%.";
    const fewShot =
      '{"content":"p50/p95/p99 latency error rate throughput","score":93,"highlights":["p95 <2s","Error <0.5%"],"metrics":["Throughput"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getObservabilityMetricsAgent(): ObservabilityMetricsAgent {
  return ObservabilityMetricsAgent.instance;
}

export function resetObservabilityMetricsAgentForTests(): void {
  ObservabilityMetricsAgent.reset();
}
