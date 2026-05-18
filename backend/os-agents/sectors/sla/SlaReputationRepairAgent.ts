import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-reputation-repair";

export class SlaReputationRepairAgent {
  private static inst: SlaReputationRepairAgent | undefined;

  static get instance(): SlaReputationRepairAgent {
    if (!SlaReputationRepairAgent.inst) SlaReputationRepairAgent.inst = new SlaReputationRepairAgent();
    return SlaReputationRepairAgent.inst;
  }

  static reset(): void {
    SlaReputationRepairAgent.inst = undefined;
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
          "ROLE: Trust recovery comms lead top 1%; autenticidad y seguimiento medible.",
        mission:
          "Genera comunicación de recuperación de confianza post-incidente: disculpa, mejora y compromiso.",
        fewShotExample:
          "Input: incidente visible. Output JSON: compensationOffer goodwill opcional; communications C-level email.",
      },
      input,
    );
  }
}

export function getSlaReputationRepairAgent(): SlaReputationRepairAgent {
  return SlaReputationRepairAgent.instance;
}

export function resetSlaReputationRepairAgentForTests(): void {
  SlaReputationRepairAgent.reset();
}
