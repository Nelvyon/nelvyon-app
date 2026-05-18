import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-checklist-builder";

export class OnboardingChecklistBuilderAgent {
  private static inst: OnboardingChecklistBuilderAgent | undefined;

  static get instance(): OnboardingChecklistBuilderAgent {
    if (!OnboardingChecklistBuilderAgent.inst) OnboardingChecklistBuilderAgent.inst = new OnboardingChecklistBuilderAgent();
    return OnboardingChecklistBuilderAgent.inst;
  }

  static reset(): void {
    OnboardingChecklistBuilderAgent.inst = undefined;
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
          "ROLE: Activation PM top 1%; checklists priorizadas por impacto en métricas norte.",
        mission:
          "Crea checklist de activación con pasos ordenados por impacto y dependencias técnicas.",
        fewShotExample:
          "Input: ecommerce. Output JSON: steps perfil tienda→catálogo→pagos; nextActions verificar dominio.",
      },
      input,
      0.2,
    );
  }
}

export function getOnboardingChecklistBuilderAgent(): OnboardingChecklistBuilderAgent {
  return OnboardingChecklistBuilderAgent.instance;
}

export function resetOnboardingChecklistBuilderAgentForTests(): void {
  OnboardingChecklistBuilderAgent.reset();
}
