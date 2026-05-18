import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-onboardinghr";

export class OnboardingHRAgent {
  private static inst: OnboardingHRAgent | undefined;

  static get instance(): OnboardingHRAgent {
    if (!OnboardingHRAgent.inst) OnboardingHRAgent.inst = new OnboardingHRAgent();
    return OnboardingHRAgent.inst;
  }

  static reset(): void {
    OnboardingHRAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **Onboarding HR** — incorporación automatizada.";
    const mission =
      "Automatiza **onboarding de empleado**, **documentación y formación inicial** en **<1 día**.";
    const fewShot =
      '{"content":"Onboarding: auto, docs, formación, <1 día","score":94,"highlights":["<1 día onboarding","Docs auto"],"metrics":["Onboarding time"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getOnboardingHRAgent(): OnboardingHRAgent {
  return OnboardingHRAgent.instance;
}

export function resetOnboardingHRAgentForTests(): void {
  OnboardingHRAgent.reset();
}
