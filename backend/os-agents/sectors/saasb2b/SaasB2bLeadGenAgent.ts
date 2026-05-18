import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-leadgen";

export class SaasB2bLeadGenAgent {
  private static inst: SaasB2bLeadGenAgent | undefined;

  static get instance(): SaasB2bLeadGenAgent {
    if (!SaasB2bLeadGenAgent.inst) SaasB2bLeadGenAgent.inst = new SaasB2bLeadGenAgent();
    return SaasB2bLeadGenAgent.inst;
  }

  static reset(): void {
    SaasB2bLeadGenAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B Lead Gen** — leads cualificados.";
    const mission = "Define **generación de leads B2B cualificados** con ICP, canales y scoring.";
    const fewShot =
      '{"result":"Lead gen B2B cualificado enterprise + PLG","score":92,"recommendations":["ICP firmográfico","MQL→SQL"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bLeadGenAgent(): SaasB2bLeadGenAgent {
  return SaasB2bLeadGenAgent.instance;
}

export function resetSaasB2bLeadGenAgentForTests(): void {
  SaasB2bLeadGenAgent.reset();
}
