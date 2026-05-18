import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-viral";

let inst: GrowthHackingViralAgent | null = null;

export class GrowthHackingViralAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingViralAgent {
    if (!inst) inst = new GrowthHackingViralAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Viral** — loops y referral con anti-fraude.";
    const mission =
      "Propón **viral loop + referral** (K-factor proxy, incentivos dobles, límites, detección abuso).";
    const fewShot =
      '{"result":"Loop invite→crédito con cap mensual","score":86,"recommendations":["T&C claros","KYC si alto riesgo","No spam contactos"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingViralAgent(): GrowthHackingViralAgent {
  return GrowthHackingViralAgent.instance();
}

export function resetGrowthHackingViralAgentForTests(): void {
  inst = null;
}
