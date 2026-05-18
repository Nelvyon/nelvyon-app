import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-policy-drafter";

export class CompliancePolicyDrafterAgent {
  private static inst: CompliancePolicyDrafterAgent | undefined;

  static get instance(): CompliancePolicyDrafterAgent {
    if (!CompliancePolicyDrafterAgent.inst) CompliancePolicyDrafterAgent.inst = new CompliancePolicyDrafterAgent();
    return CompliancePolicyDrafterAgent.inst;
  }

  static reset(): void {
    CompliancePolicyDrafterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Security policy drafter top 1%; políticas auditables sin texto legal sustitutivo.",
      mission:
        "Genera borradores de políticas de seguridad requeridas por el framework (alcance, roles, revisiones, excepciones).",
      fewShotExample:
        '{"content":"COMPLY: borrador política acceso con definiciones, clasificación datos del brief, proceso excepciones y revisión anual.","score":87,"controls":["Plantilla política clasificación información","Anexo control cambios documentado"],"gaps":["Falta política uso criptografía para datos sensibles","Sin tabla titular-DPO si EU"]}',
    }, input);
  }
}

export function getCompliancePolicyDrafterAgent(): CompliancePolicyDrafterAgent {
  return CompliancePolicyDrafterAgent.instance;
}

export function resetCompliancePolicyDrafterAgentForTests(): void {
  CompliancePolicyDrafterAgent.reset();
}
