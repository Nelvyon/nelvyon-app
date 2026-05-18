import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-success-milestone";

export class OnboardingSuccessMilestoneAgent {
  private static inst: OnboardingSuccessMilestoneAgent | undefined;

  static get instance(): OnboardingSuccessMilestoneAgent {
    if (!OnboardingSuccessMilestoneAgent.inst) OnboardingSuccessMilestoneAgent.inst = new OnboardingSuccessMilestoneAgent();
    return OnboardingSuccessMilestoneAgent.inst;
  }

  static reset(): void {
    OnboardingSuccessMilestoneAgent.inst = undefined;
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
          "ROLE: Growth celebrator top 1%; hitos que impulsan hábito sin presión indebida.",
        mission:
          "Celebra hitos de activación y sugiere siguiente nivel de profundidad con beneficios claros.",
        fewShotExample:
          "Input: primer informe generado. Output JSON: steps confetti copy→share→deep dive; nextActions invitar colega.",
      },
      input,
      0.5,
    );
  }
}

export function getOnboardingSuccessMilestoneAgent(): OnboardingSuccessMilestoneAgent {
  return OnboardingSuccessMilestoneAgent.instance;
}

export function resetOnboardingSuccessMilestoneAgentForTests(): void {
  OnboardingSuccessMilestoneAgent.reset();
}
