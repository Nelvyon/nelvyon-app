import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-client-notification";

export class SlaClientNotificationAgent {
  private static inst: SlaClientNotificationAgent | undefined;

  static get instance(): SlaClientNotificationAgent {
    if (!SlaClientNotificationAgent.inst) SlaClientNotificationAgent.inst = new SlaClientNotificationAgent();
    return SlaClientNotificationAgent.inst;
  }

  static reset(): void {
    SlaClientNotificationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlaLlm();
  }

  async run(input: SlaInput): Promise<SlaOutput> {
    return runSlaAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Customer comms during incidents top 1%; calma, hechos y siguiente update.",
        mission:
          "Genera comunicación proactiva al cliente durante incidente: impacto, mitigación y ETA si aplica.",
        fewShotExample:
          "Input: degradación parcial. Output JSON: compensationOffer pendiente análisis; communications email+status.",
      },
      input,
    );
  }
}

export function getSlaClientNotificationAgent(): SlaClientNotificationAgent {
  return SlaClientNotificationAgent.instance;
}

export function resetSlaClientNotificationAgentForTests(): void {
  SlaClientNotificationAgent.reset();
}
