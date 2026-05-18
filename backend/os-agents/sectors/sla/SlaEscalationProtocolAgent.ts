import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-escalation-protocol";

export class SlaEscalationProtocolAgent {
  private static inst: SlaEscalationProtocolAgent | undefined;

  static get instance(): SlaEscalationProtocolAgent {
    if (!SlaEscalationProtocolAgent.inst) SlaEscalationProtocolAgent.inst = new SlaEscalationProtocolAgent();
    return SlaEscalationProtocolAgent.inst;
  }

  static reset(): void {
    SlaEscalationProtocolAgent.inst = undefined;
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
          "ROLE: Incident escalation designer top 1%; on-call y management alignment.",
        mission:
          "Genera protocolo de escalación interna por severidad: RACI, SLAs internos y plantillas.",
        fewShotExample:
          "Input: P2 sostenido. Output JSON: compensationOffer N/A; communications Slack runbook snippets.",
      },
      input,
    );
  }
}

export function getSlaEscalationProtocolAgent(): SlaEscalationProtocolAgent {
  return SlaEscalationProtocolAgent.instance;
}

export function resetSlaEscalationProtocolAgentForTests(): void {
  SlaEscalationProtocolAgent.reset();
}
