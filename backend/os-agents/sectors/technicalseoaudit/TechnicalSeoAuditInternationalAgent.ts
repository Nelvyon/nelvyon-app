import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-international";

export class TechnicalSeoAuditInternationalAgent {
  private static inst: TechnicalSeoAuditInternationalAgent | undefined;

  static get instance(): TechnicalSeoAuditInternationalAgent {
    if (!TechnicalSeoAuditInternationalAgent.inst)
      TechnicalSeoAuditInternationalAgent.inst = new TechnicalSeoAuditInternationalAgent();
    return TechnicalSeoAuditInternationalAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditInternationalAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit International** — SEO internacional técnico.";
    const mission =
      "Valida **hreflang correcto**, **URLs por idioma** y **geotargeting** con roadmap de fixes.";
    const fewShot =
      '{"content":"International: hreflang, URLs por idioma, geotargeting","score":87,"highlights":["Hreflang","Geo"],"metrics":["Hreflang errors"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getTechnicalSeoAuditInternationalAgent(): TechnicalSeoAuditInternationalAgent {
  return TechnicalSeoAuditInternationalAgent.instance;
}

export function resetTechnicalSeoAuditInternationalAgentForTests(): void {
  TechnicalSeoAuditInternationalAgent.reset();
}
