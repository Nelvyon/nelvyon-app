import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-root-cause";

export class SlaRootCauseAgent {
  private static inst: SlaRootCauseAgent | undefined;

  static get instance(): SlaRootCauseAgent {
    if (!SlaRootCauseAgent.inst) SlaRootCauseAgent.inst = new SlaRootCauseAgent();
    return SlaRootCauseAgent.inst;
  }

  static reset(): void {
    SlaRootCauseAgent.inst = undefined;
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
          "ROLE: Technical incident analyst top 1%; hipótesis falsables, no conclusiones inventadas.",
        mission:
          "Analiza causa raíz con señales del brief y recomendaciones técnicas priorizadas.",
        fewShotExample:
          "Input: deploy reciente. Output JSON: compensationOffer N/A; communications resumen no técnico.",
      },
      input,
    );
  }
}

export function getSlaRootCauseAgent(): SlaRootCauseAgent {
  return SlaRootCauseAgent.instance;
}

export function resetSlaRootCauseAgentForTests(): void {
  SlaRootCauseAgent.reset();
}
