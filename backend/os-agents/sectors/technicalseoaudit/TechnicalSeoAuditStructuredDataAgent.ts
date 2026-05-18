import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-structureddata";

export class TechnicalSeoAuditStructuredDataAgent {
  private static inst: TechnicalSeoAuditStructuredDataAgent | undefined;

  static get instance(): TechnicalSeoAuditStructuredDataAgent {
    if (!TechnicalSeoAuditStructuredDataAgent.inst)
      TechnicalSeoAuditStructuredDataAgent.inst = new TechnicalSeoAuditStructuredDataAgent();
    return TechnicalSeoAuditStructuredDataAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditStructuredDataAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit StructuredData** — schema markup y rich snippets.";
    const mission =
      "Valida **schema markup**, **implementación**, **rich snippets** y **errores** con snippets de código listos.";
    const fewShot =
      '{"content":"Structured data: validación schema, rich snippets, errores, código fix","score":90,"highlights":["Schema","Rich snippets"],"metrics":["Schema errors"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getTechnicalSeoAuditStructuredDataAgent(): TechnicalSeoAuditStructuredDataAgent {
  return TechnicalSeoAuditStructuredDataAgent.instance;
}

export function resetTechnicalSeoAuditStructuredDataAgentForTests(): void {
  TechnicalSeoAuditStructuredDataAgent.reset();
}
