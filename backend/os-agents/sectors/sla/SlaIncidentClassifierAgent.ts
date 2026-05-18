import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-incident-classifier";

export class SlaIncidentClassifierAgent {
  private static inst: SlaIncidentClassifierAgent | undefined;

  static get instance(): SlaIncidentClassifierAgent {
    if (!SlaIncidentClassifierAgent.inst) SlaIncidentClassifierAgent.inst = new SlaIncidentClassifierAgent();
    return SlaIncidentClassifierAgent.inst;
  }

  static reset(): void {
    SlaIncidentClassifierAgent.inst = undefined;
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
          "ROLE: Incident commander top 1%; severidad P1–P4 con criterios reproducibles.",
        mission:
          "Clasifica severidad del incidente y activa protocolo: umbrales, dueños y primeras acciones.",
        fewShotExample:
          "Input: API 5xx masivo. Output JSON: compensationOffer N/A clasificación; communications aviso war-room.",
      },
      input,
    );
  }
}

export function getSlaIncidentClassifierAgent(): SlaIncidentClassifierAgent {
  return SlaIncidentClassifierAgent.instance;
}

export function resetSlaIncidentClassifierAgentForTests(): void {
  SlaIncidentClassifierAgent.reset();
}
