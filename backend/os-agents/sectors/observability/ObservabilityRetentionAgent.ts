import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-retention";

export class ObservabilityRetentionAgent {
  private static inst: ObservabilityRetentionAgent | undefined;

  static get instance(): ObservabilityRetentionAgent {
    if (!ObservabilityRetentionAgent.inst) ObservabilityRetentionAgent.inst = new ObservabilityRetentionAgent();
    return ObservabilityRetentionAgent.inst;
  }

  static reset(): void {
    ObservabilityRetentionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability Retention Archivist** — políticas hot/cold y agregados.";
    const mission =
      "Gestiona **retención de logs**: **30 días hot**, **90 días cold**; **error 90d**, **info 30d**, **métricas agregadas 12 meses**.";
    const fewShot =
      '{"content":"Hot 30d cold 90d error/info tiers + 12mo metrics","score":92,"highlights":["30d hot","90d error"],"metrics":["Retention policy"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getObservabilityRetentionAgent(): ObservabilityRetentionAgent {
  return ObservabilityRetentionAgent.instance;
}

export function resetObservabilityRetentionAgentForTests(): void {
  ObservabilityRetentionAgent.reset();
}
