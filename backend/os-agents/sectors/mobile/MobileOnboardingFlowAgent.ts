import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-onboarding-flow";

export class MobileOnboardingFlowAgent {
  private static inst: MobileOnboardingFlowAgent | undefined;

  static get instance(): MobileOnboardingFlowAgent {
    if (!MobileOnboardingFlowAgent.inst) MobileOnboardingFlowAgent.inst = new MobileOnboardingFlowAgent();
    return MobileOnboardingFlowAgent.inst;
  }

  static reset(): void {
    MobileOnboardingFlowAgent.inst = undefined;
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
          "ROLE: Mobile UX writer top 1%; onboarding que reduce abandono y maximiza activación.",
        mission:
          "Diseña flujo de onboarding por pasos: pantallas, microcopy, permisos y primer valor.",
        fewShotExample:
          "Input: fintech iOS. Output JSON: screens Splash→Permisos→Objetivo→Demo; features biometric login, tips.",
      },
      input,
      0.5,
    );
  }
}

export function getMobileOnboardingFlowAgent(): MobileOnboardingFlowAgent {
  return MobileOnboardingFlowAgent.instance;
}

export function resetMobileOnboardingFlowAgentForTests(): void {
  MobileOnboardingFlowAgent.reset();
}
