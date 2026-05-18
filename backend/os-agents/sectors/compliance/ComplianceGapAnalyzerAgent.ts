import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-gap-analyzer";

export class ComplianceGapAnalyzerAgent {
  private static inst: ComplianceGapAnalyzerAgent | undefined;

  static get instance(): ComplianceGapAnalyzerAgent {
    if (!ComplianceGapAnalyzerAgent.inst) ComplianceGapAnalyzerAgent.inst = new ComplianceGapAnalyzerAgent();
    return ComplianceGapAnalyzerAgent.inst;
  }

  static reset(): void {
    ComplianceGapAnalyzerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Readiness gap analyst top 1%; lectura honesta entre estado actual y marcos SOC 2 / ISO 27001.",
      mission:
        "Analiza gaps entre controles actuales declarados y requisitos del framework indicado; prioriza por severidad y esfuerzo.",
      fewShotExample:
        '{"content":"COMPLY aplicado: Controls IAM baseline; Obligations CC6/CC7 orientativas; Map evidencias faltantes; Protect MFA everywhere; Log retención 90d; Yield backlog trimestral.","score":88,"controls":["MFA en IdP corporativo","Backup cifrado diario"],"gaps":["Política retención logs sin owner","Vendor risk sin revisión anual formalizada"]}',
    }, input);
  }
}

export function getComplianceGapAnalyzerAgent(): ComplianceGapAnalyzerAgent {
  return ComplianceGapAnalyzerAgent.instance;
}

export function resetComplianceGapAnalyzerAgentForTests(): void {
  ComplianceGapAnalyzerAgent.reset();
}
