import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-onboardingsuccess";

export class OnboardingSuccessAgent {
  private static inst: OnboardingSuccessAgent | undefined;

  static get instance(): OnboardingSuccessAgent {
    if (!OnboardingSuccessAgent.inst) OnboardingSuccessAgent.inst = new OnboardingSuccessAgent();
    return OnboardingSuccessAgent.inst;
  }

  static reset(): void {
    OnboardingSuccessAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **Onboarding Success** — activación automatizada.";
    const mission =
      "Automatiza **onboarding**, **milestones** y **activación primer valor**; **time to first value <24 h**; **0 humano**.";
    const fewShot =
      '{"content":"Onboarding: milestones, primer valor <24 h, 0 humano","score":91,"highlights":["<24 h TTFV","0 humano"],"metrics":["Time to first value"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.55);
  }
}

export function getOnboardingSuccessAgent(): OnboardingSuccessAgent {
  return OnboardingSuccessAgent.instance;
}

export function resetOnboardingSuccessAgentForTests(): void {
  OnboardingSuccessAgent.reset();
}
