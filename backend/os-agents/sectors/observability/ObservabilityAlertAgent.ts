import type { ILlmClient } from "../../LlmClient";
import type { ObservabilityInput, ObservabilityOutput } from "./shared";
import { getDefaultObservabilityLlm, runObservabilityAgentCore } from "./shared";

const AGENT_ID = "observability-alert";

export class ObservabilityAlertAgent {
  private static inst: ObservabilityAlertAgent | undefined;

  static get instance(): ObservabilityAlertAgent {
    if (!ObservabilityAlertAgent.inst) ObservabilityAlertAgent.inst = new ObservabilityAlertAgent();
    return ObservabilityAlertAgent.inst;
  }

  static reset(): void {
    ObservabilityAlertAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultObservabilityLlm();
  }

  async run(input: ObservabilityInput): Promise<ObservabilityOutput> {
    const eliteRole =
      "Eres **Observability Alerting Lead** — umbrales SLO y escalado Slack/email.";
    const mission =
      "Configura **alertas automáticas**: **error rate >1%** → Slack+email inmediato; **p95 >3s** warning; **coste >umbral** y **budget 80%**.";
    const fewShot =
      '{"content":"Error>1% Slack+email; p95>3s warn; cost threshold","score":91,"highlights":["Critical alert","Budget 80%"],"metrics":["MTTR"]}';
    return runObservabilityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getObservabilityAlertAgent(): ObservabilityAlertAgent {
  return ObservabilityAlertAgent.instance;
}

export function resetObservabilityAlertAgentForTests(): void {
  ObservabilityAlertAgent.reset();
}
