import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-retention-flow";

export class MobileRetentionFlowAgent {
  private static inst: MobileRetentionFlowAgent | undefined;

  static get instance(): MobileRetentionFlowAgent {
    if (!MobileRetentionFlowAgent.inst) MobileRetentionFlowAgent.inst = new MobileRetentionFlowAgent();
    return MobileRetentionFlowAgent.inst;
  }

  static reset(): void {
    MobileRetentionFlowAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMobileLlm();
  }

  async run(input: MobileInput): Promise<MobileOutput> {
    return runMobileAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Retention architect top 1%; win-back sin fricción ni dark patterns.",
        mission:
          "Crea flujos de retención y reactivación: segmentos inactivos, incentives éticos y métricas.",
        fewShotExample:
          "Input: SaaS mobile. Output JSON: screens win-back modal email→push; features cohort rules D30/D60.",
      },
      input,
      0.2,
    );
  }
}

export function getMobileRetentionFlowAgent(): MobileRetentionFlowAgent {
  return MobileRetentionFlowAgent.instance;
}

export function resetMobileRetentionFlowAgentForTests(): void {
  MobileRetentionFlowAgent.reset();
}
