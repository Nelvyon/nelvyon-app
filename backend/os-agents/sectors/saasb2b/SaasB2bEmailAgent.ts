import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-email";

export class SaasB2bEmailAgent {
  private static inst: SaasB2bEmailAgent | undefined;

  static get instance(): SaasB2bEmailAgent {
    if (!SaasB2bEmailAgent.inst) SaasB2bEmailAgent.inst = new SaasB2bEmailAgent();
    return SaasB2bEmailAgent.inst;
  }

  static reset(): void {
    SaasB2bEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B Email** — nurturing y churn.";
    const mission = "Diseña **secuencias email nurturing** y **prevención de churn** con playbooks lifecycle.";
    const fewShot =
      '{"result":"Email nurturing + churn prevention SaaS","score":91,"recommendations":["Lifecycle trial","Win-back"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bEmailAgent(): SaasB2bEmailAgent {
  return SaasB2bEmailAgent.instance;
}

export function resetSaasB2bEmailAgentForTests(): void {
  SaasB2bEmailAgent.reset();
}
