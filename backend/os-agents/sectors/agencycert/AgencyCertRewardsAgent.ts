import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-rewards";

export class AgencyCertRewardsAgent {
  private static inst: AgencyCertRewardsAgent | undefined;

  static get instance(): AgencyCertRewardsAgent {
    if (!AgencyCertRewardsAgent.inst) AgencyCertRewardsAgent.inst = new AgencyCertRewardsAgent();
    return AgencyCertRewardsAgent.inst;
  }

  static reset(): void {
    AgencyCertRewardsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgencyCertLlm();
  }

  async run(input: AgencyCertInput): Promise<AgencyCertOutput> {
    return runAgencyCertAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Benefits entitlements; Platinum = máximo valor.",
        mission:
          "Aplica beneficios por nivel: **comisión 40%** Platinum vs **30%** estándar, **white-label**, **soporte prioritario**, AM dedicado automatizado, beta.",
        fewShotExample:
          '{"content":"Platinum unlock: 40% + WL + beta.","score":93,"highlights":["40% recurrente","SLA 4h"],"metrics":["Flags billing"]}',
      },
      input,
      0.2,
    );
  }
}

export function getAgencyCertRewardsAgent(): AgencyCertRewardsAgent {
  return AgencyCertRewardsAgent.instance;
}

export function resetAgencyCertRewardsAgentForTests(): void {
  AgencyCertRewardsAgent.reset();
}
