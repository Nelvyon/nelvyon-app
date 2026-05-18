import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-security";

export class TechnicalSeoAuditSecurityAgent {
  private static inst: TechnicalSeoAuditSecurityAgent | undefined;

  static get instance(): TechnicalSeoAuditSecurityAgent {
    if (!TechnicalSeoAuditSecurityAgent.inst) TechnicalSeoAuditSecurityAgent.inst = new TechnicalSeoAuditSecurityAgent();
    return TechnicalSeoAuditSecurityAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditSecurityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit Security** — seguridad con impacto SEO.";
    const mission =
      "Audita **HTTPS**, **mixed content**, **certificados** y **vulnerabilidades** con alertas 24/7.";
    const fewShot =
      '{"content":"Security: HTTPS, mixed content, certificados, vulnerabilidades","score":89,"highlights":["HTTPS","Mixed content"],"metrics":["Security issues"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getTechnicalSeoAuditSecurityAgent(): TechnicalSeoAuditSecurityAgent {
  return TechnicalSeoAuditSecurityAgent.instance;
}

export function resetTechnicalSeoAuditSecurityAgentForTests(): void {
  TechnicalSeoAuditSecurityAgent.reset();
}
