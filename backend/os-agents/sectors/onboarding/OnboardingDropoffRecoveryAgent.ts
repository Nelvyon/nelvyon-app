import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-dropoff-recovery";

export class OnboardingDropoffRecoveryAgent {
  private static inst: OnboardingDropoffRecoveryAgent | undefined;

  static get instance(): OnboardingDropoffRecoveryAgent {
    if (!OnboardingDropoffRecoveryAgent.inst) OnboardingDropoffRecoveryAgent.inst = new OnboardingDropoffRecoveryAgent();
    return OnboardingDropoffRecoveryAgent.inst;
  }

  static reset(): void {
    OnboardingDropoffRecoveryAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOnboardingLlm();
  }

  async run(input: OnboardingInput): Promise<OnboardingOutput> {
    return runOnboardingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Drop-off analyst top 1%; intervenciones éticas basadas en señales.",
        mission:
          "Ante abandono, genera hipótesis, mensaje de recuperación personalizado y experimento de validación.",
        fewShotExample:
          "Input: usuario parado en paso 2. Output JSON: steps diagnóstico→email→in-app; nextActions medir reply rate.",
      },
      input,
      0.2,
    );
  }
}

export function getOnboardingDropoffRecoveryAgent(): OnboardingDropoffRecoveryAgent {
  return OnboardingDropoffRecoveryAgent.instance;
}

export function resetOnboardingDropoffRecoveryAgentForTests(): void {
  OnboardingDropoffRecoveryAgent.reset();
}
