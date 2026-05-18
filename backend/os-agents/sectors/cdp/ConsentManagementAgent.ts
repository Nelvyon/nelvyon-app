import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-consentmanagement";

export class ConsentManagementAgent {
  private static inst: ConsentManagementAgent | undefined;

  static get instance(): ConsentManagementAgent {
    if (!ConsentManagementAgent.inst) ConsentManagementAgent.inst = new ConsentManagementAgent();
    return ConsentManagementAgent.inst;
  }

  static reset(): void {
    ConsentManagementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Consent Management** — GDPR/CCPA y preferencias.";
    const mission =
      "Gestiona **consentimientos GDPR/CCPA**, **preferencias de usuario** y **audit trail** con cumplimiento **100% automático**.";
    const fewShot =
      '{"content":"Consent: GDPR/CCPA, preferencias, audit trail, 100% automático","score":97,"highlights":["GDPR/CCPA","Audit trail"],"metrics":["Consent coverage"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getConsentManagementAgent(): ConsentManagementAgent {
  return ConsentManagementAgent.instance;
}

export function resetConsentManagementAgentForTests(): void {
  ConsentManagementAgent.reset();
}
