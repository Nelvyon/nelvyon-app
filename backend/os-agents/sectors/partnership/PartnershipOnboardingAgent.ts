import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-onboarding";

let inst: PartnershipOnboardingAgent | null = null;

export class PartnershipOnboardingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipOnboardingAgent {
    if (!inst) inst = new PartnershipOnboardingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Onboarding** — habilitación rápida y segura del socio.";
    const mission =
      "Construye **onboarding automático** (legal, técnico, comercial, soporte; hitos D+7/D+30).";
    const fewShot =
      '{"result":"Checklist 22 ítems + owners + sandbox keys","score":86,"recommendations":["Segregación datos","Training cert","Health score partner"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipOnboardingAgent(): PartnershipOnboardingAgent {
  return PartnershipOnboardingAgent.instance();
}

export function resetPartnershipOnboardingAgentForTests(): void {
  inst = null;
}
