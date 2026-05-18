import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-logger";

export class ObservabilityLoggerAgent {
  private static inst: ObservabilityLoggerAgent | undefined;

  static get instance(): ObservabilityLoggerAgent {
    if (!ObservabilityLoggerAgent.inst) ObservabilityLoggerAgent.inst = new ObservabilityLoggerAgent();
    return ObservabilityLoggerAgent.inst;
  }

  static reset(): void {
    ObservabilityLoggerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability Structured Logger** — JSON logs con niveles error/warn/info.";
    const mission =
      "Define **logging estructurado** de **errores**, **warnings** e **info**; campos estándar, redacción PII y retención info 30d / error 90d.";
    const fewShot =
      '{"content":"JSON logs error/warn/info with traceId","score":92,"highlights":["Structured","PII redact"],"metrics":["Log volume"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getObservabilityLoggerAgent(): ObservabilityLoggerAgent {
  return ObservabilityLoggerAgent.instance;
}

export function resetObservabilityLoggerAgentForTests(): void {
  ObservabilityLoggerAgent.reset();
}
