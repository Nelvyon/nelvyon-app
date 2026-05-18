import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-postmortem";

export class SlaPostmortemAgent {
  private static inst: SlaPostmortemAgent | undefined;

  static get instance(): SlaPostmortemAgent {
    if (!SlaPostmortemAgent.inst) SlaPostmortemAgent.inst = new SlaPostmortemAgent();
    return SlaPostmortemAgent.inst;
  }

  static reset(): void {
    SlaPostmortemAgent.inst = undefined;
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
          "ROLE: Blameless postmortem lead top 1%; aprendizaje accionable.",
        mission:
          "Redacta postmortem ejecutivo: timeline, causa contribuyente, acciones y dueños.",
        fewShotExample:
          "Input: incidente resuelto. Output JSON: compensationOffer resumen créditos; communications versión cliente.",
      },
      input,
    );
  }
}

export function getSlaPostmortemAgent(): SlaPostmortemAgent {
  return SlaPostmortemAgent.instance;
}

export function resetSlaPostmortemAgentForTests(): void {
  SlaPostmortemAgent.reset();
}
