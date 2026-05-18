import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-welcome-flow";

export class OnboardingWelcomeFlowAgent {
  private static inst: OnboardingWelcomeFlowAgent | undefined;

  static get instance(): OnboardingWelcomeFlowAgent {
    if (!OnboardingWelcomeFlowAgent.inst) OnboardingWelcomeFlowAgent.inst = new OnboardingWelcomeFlowAgent();
    return OnboardingWelcomeFlowAgent.inst;
  }

  static reset(): void {
    OnboardingWelcomeFlowAgent.inst = undefined;
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
          "ROLE: Onboarding journey designer top 1%; bienvenida que reduce abandono inicial.",
        mission:
          "Genera flujo de bienvenida personalizado por sector y rol: pantallas, microcopy y primer valor.",
        fewShotExample:
          "Input: SaaS analytics, rol admin. Output JSON: steps bienvenida→conectar datos→primer dashboard; nextActions invitar equipo.",
      },
      input,
      0.5,
    );
  }
}

export function getOnboardingWelcomeFlowAgent(): OnboardingWelcomeFlowAgent {
  return OnboardingWelcomeFlowAgent.instance;
}

export function resetOnboardingWelcomeFlowAgentForTests(): void {
  OnboardingWelcomeFlowAgent.reset();
}
