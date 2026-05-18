import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-monetization";

export class CommunityMonetizationAgent {
  private static inst: CommunityMonetizationAgent | undefined;

  static get instance(): CommunityMonetizationAgent {
    if (!CommunityMonetizationAgent.inst) CommunityMonetizationAgent.inst = new CommunityMonetizationAgent();
    return CommunityMonetizationAgent.inst;
  }

  static reset(): void {
    CommunityMonetizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Monetization** — ingresos por miembro activo.";
    const mission =
      "Monetiza con **membresías premium**, **eventos pagos** y **sponsors**; **revenue/miembro activo >15€/mes**.";
    const fewShot =
      '{"content":"Monetization: premium, eventos pagos, sponsors, >15€/miembro activo","score":90,"highlights":[">15€/activo","Premium tiers"],"metrics":["Revenue per active member"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getCommunityMonetizationAgent(): CommunityMonetizationAgent {
  return CommunityMonetizationAgent.instance;
}

export function resetCommunityMonetizationAgentForTests(): void {
  CommunityMonetizationAgent.reset();
}
