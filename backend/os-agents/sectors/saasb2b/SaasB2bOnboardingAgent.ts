import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-onboarding";

export class SaasB2bOnboardingAgent {
  private static inst: SaasB2bOnboardingAgent | undefined;

  static get instance(): SaasB2bOnboardingAgent {
    if (!SaasB2bOnboardingAgent.inst) SaasB2bOnboardingAgent.inst = new SaasB2bOnboardingAgent();
    return SaasB2bOnboardingAgent.inst;
  }

  static reset(): void {
    SaasB2bOnboardingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B Onboarding** — trial-to-paid.";
    const mission = "Estructura **onboarding automatizado trial-to-paid** con hitos de activación y expansión.";
    const fewShot =
      '{"result":"Onboarding trial-to-paid automatizado","score":91,"recommendations":["Checklist activación","Nudges día 3"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bOnboardingAgent(): SaasB2bOnboardingAgent {
  return SaasB2bOnboardingAgent.instance;
}

export function resetSaasB2bOnboardingAgentForTests(): void {
  SaasB2bOnboardingAgent.reset();
}
