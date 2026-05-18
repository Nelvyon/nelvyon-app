import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-analytics";

export class SaasB2bAnalyticsAgent {
  private static inst: SaasB2bAnalyticsAgent | undefined;

  static get instance(): SaasB2bAnalyticsAgent {
    if (!SaasB2bAnalyticsAgent.inst) SaasB2bAnalyticsAgent.inst = new SaasB2bAnalyticsAgent();
    return SaasB2bAnalyticsAgent.inst;
  }

  static reset(): void {
    SaasB2bAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B Analytics** — producto y MRR.";
    const mission = "Define **product analytics** y **MRR tracking** con cohortes, expansión y health scores.";
    const fewShot =
      '{"result":"Product analytics + MRR tracking","score":93,"recommendations":["Cohortes trial","NRR dashboard"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bAnalyticsAgent(): SaasB2bAnalyticsAgent {
  return SaasB2bAnalyticsAgent.instance;
}

export function resetSaasB2bAnalyticsAgentForTests(): void {
  SaasB2bAnalyticsAgent.reset();
}
