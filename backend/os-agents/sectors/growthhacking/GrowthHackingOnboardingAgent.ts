import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-onboarding";

let inst: GrowthHackingOnboardingAgent | null = null;

export class GrowthHackingOnboardingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingOnboardingAgent {
    if (!inst) inst = new GrowthHackingOnboardingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Onboarding** — activación máxima sin fatigar.";
    const mission =
      "Optimiza **onboarding** (time-to-value, checklist mínimo, empty states, triggers producto-led).";
    const fewShot =
      '{"result":"Flow 5 pasos + “aha” en <10 min","score":89,"recommendations":["Medir TTV","Reducir campos","Tooltips contextuales"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingOnboardingAgent(): GrowthHackingOnboardingAgent {
  return GrowthHackingOnboardingAgent.instance();
}

export function resetGrowthHackingOnboardingAgentForTests(): void {
  inst = null;
}
