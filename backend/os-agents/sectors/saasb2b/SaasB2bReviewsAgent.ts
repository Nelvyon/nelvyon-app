import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-reviews";

export class SaasB2bReviewsAgent {
  private static inst: SaasB2bReviewsAgent | undefined;

  static get instance(): SaasB2bReviewsAgent {
    if (!SaasB2bReviewsAgent.inst) SaasB2bReviewsAgent.inst = new SaasB2bReviewsAgent();
    return SaasB2bReviewsAgent.inst;
  }

  static reset(): void {
    SaasB2bReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B Reviews** — G2 y Capterra.";
    const mission = "Estructura **G2/Capterra reviews** y **social proof** para pipeline enterprise.";
    const fewShot =
      '{"result":"G2/Capterra + social proof B2B","score":92,"recommendations":["Campaña reviews","Badges trust"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bReviewsAgent(): SaasB2bReviewsAgent {
  return SaasB2bReviewsAgent.instance;
}

export function resetSaasB2bReviewsAgentForTests(): void {
  SaasB2bReviewsAgent.reset();
}
