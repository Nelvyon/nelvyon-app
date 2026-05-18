import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-progress-nudge";

export class OnboardingProgressNudgeAgent {
  private static inst: OnboardingProgressNudgeAgent | undefined;

  static get instance(): OnboardingProgressNudgeAgent {
    if (!OnboardingProgressNudgeAgent.inst) OnboardingProgressNudgeAgent.inst = new OnboardingProgressNudgeAgent();
    return OnboardingProgressNudgeAgent.inst;
  }

  static reset(): void {
    OnboardingProgressNudgeAgent.inst = undefined;
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
          "ROLE: Behavioral copy chief top 1%; motivación sin culpa ni spam.",
        mission:
          "Genera mensajes de progreso y motivación por etapa; refuerzo positivo y siguiente paso claro.",
        fewShotExample:
          "Input: fitness app. Output JSON: steps semana 1 checklist; nextActions recordatorio amable D3.",
      },
      input,
      0.5,
    );
  }
}

export function getOnboardingProgressNudgeAgent(): OnboardingProgressNudgeAgent {
  return OnboardingProgressNudgeAgent.instance;
}

export function resetOnboardingProgressNudgeAgentForTests(): void {
  OnboardingProgressNudgeAgent.reset();
}
