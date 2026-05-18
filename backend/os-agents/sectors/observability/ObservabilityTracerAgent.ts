import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-tracer";

export class ObservabilityTracerAgent {
  private static inst: ObservabilityTracerAgent | undefined;

  static get instance(): ObservabilityTracerAgent {
    if (!ObservabilityTracerAgent.inst) ObservabilityTracerAgent.inst = new ObservabilityTracerAgent();
    return ObservabilityTracerAgent.inst;
  }

  static reset(): void {
    ObservabilityTracerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability Distributed Tracer** — spans por ejecución de agente con latencia, tokens y coste.";
    const mission =
      "Traza **cada ejecución de agente**: **latencia** (µs), **tokens**, **coste €**; correlación traceId y cumplimiento SLO p95 <2s.";
    const fewShot =
      '{"content":"Per-agent span latency µs tokens € correlated","score":94,"highlights":["Trace span","Cost per run"],"metrics":["p95 latency"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getObservabilityTracerAgent(): ObservabilityTracerAgent {
  return ObservabilityTracerAgent.instance;
}

export function resetObservabilityTracerAgentForTests(): void {
  ObservabilityTracerAgent.reset();
}
