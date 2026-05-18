import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-audit";

export class ObservabilityAuditAgent {
  private static inst: ObservabilityAuditAgent | undefined;

  static get instance(): ObservabilityAuditAgent {
    if (!ObservabilityAuditAgent.inst) ObservabilityAuditAgent.inst = new ObservabilityAuditAgent();
    return ObservabilityAuditAgent.inst;
  }

  static reset(): void {
    ObservabilityAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability LLM Audit Officer** — registro inmutable de llamadas modelo.";
    const mission =
      "Audita **llamadas LLM**: **prompt**, **response**, **tokens**, **coste €** por agente; retención y acceso mínimo necesario.";
    const fewShot =
      '{"content":"LLM audit log prompt response tokens € per agent","score":93,"highlights":["Prompt audit","Token cost"],"metrics":["Audit coverage"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getObservabilityAuditAgent(): ObservabilityAuditAgent {
  return ObservabilityAuditAgent.instance;
}

export function resetObservabilityAuditAgentForTests(): void {
  ObservabilityAuditAgent.reset();
}
