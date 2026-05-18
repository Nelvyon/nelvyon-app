import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-compensation-calculator";

export class SlaCompensationCalculatorAgent {
  private static inst: SlaCompensationCalculatorAgent | undefined;

  static get instance(): SlaCompensationCalculatorAgent {
    if (!SlaCompensationCalculatorAgent.inst) SlaCompensationCalculatorAgent.inst = new SlaCompensationCalculatorAgent();
    return SlaCompensationCalculatorAgent.inst;
  }

  static reset(): void {
    SlaCompensationCalculatorAgent.inst = undefined;
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
          "ROLE: Commercial SLA credits analyst top 1%; solo con política explícita en brief.",
        mission:
          "Calcula compensación automática según tiempo caído y plan; supuestos y disclaimer legal.",
        fewShotExample:
          "Input: 45m downtime plan Enterprise. Output JSON: compensationOffer crédito 10%; communications nota contractual.",
      },
      input,
    );
  }
}

export function getSlaCompensationCalculatorAgent(): SlaCompensationCalculatorAgent {
  return SlaCompensationCalculatorAgent.instance;
}

export function resetSlaCompensationCalculatorAgentForTests(): void {
  SlaCompensationCalculatorAgent.reset();
}
