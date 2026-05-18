import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-social";

export class SaasB2bSocialAgent {
  private static inst: SaasB2bSocialAgent | undefined;

  static get instance(): SaasB2bSocialAgent {
    if (!SaasB2bSocialAgent.inst) SaasB2bSocialAgent.inst = new SaasB2bSocialAgent();
    return SaasB2bSocialAgent.inst;
  }

  static reset(): void {
    SaasB2bSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B Social** — LinkedIn B2B.";
    const mission = "Planifica **LinkedIn y social B2B** con thought leadership, ABM y contenido ejecutivo.";
    const fewShot =
      '{"result":"LinkedIn + social B2B para SaaS","score":90,"recommendations":["Founder posts","ABM accounts"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bSocialAgent(): SaasB2bSocialAgent {
  return SaasB2bSocialAgent.instance;
}

export function resetSaasB2bSocialAgentForTests(): void {
  SaasB2bSocialAgent.reset();
}
