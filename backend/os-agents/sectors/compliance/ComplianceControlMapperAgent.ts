import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-control-mapper";

export class ComplianceControlMapperAgent {
  private static inst: ComplianceControlMapperAgent | undefined;

  static get instance(): ComplianceControlMapperAgent {
    if (!ComplianceControlMapperAgent.inst) ComplianceControlMapperAgent.inst = new ComplianceControlMapperAgent();
    return ComplianceControlMapperAgent.inst;
  }

  static reset(): void {
    ComplianceControlMapperAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Control mapping SME top 1%; cruces claros entre controles internos y mandatos del framework.",
      mission:
        "Mapea controles de seguridad requeridos por el framework declarado a prácticas concretas del sector y controles ya existentes en el brief.",
      fewShotExample:
        '{"content":"COMPLY: tabla implícita A.5.1 políticas ↔ doc ISMS; CC6.1 firewall ↔ segmentación VPC; evidencias sugeridas por cruce.","score":90,"controls":["CC6.6 monitoreo SIEM","A.8.2 gestión privilegios"],"gaps":["Matriz RACI control-evidencia incompleta","Segregación ambientes no documentada"]}',
    }, input);
  }
}

export function getComplianceControlMapperAgent(): ComplianceControlMapperAgent {
  return ComplianceControlMapperAgent.instance;
}

export function resetComplianceControlMapperAgentForTests(): void {
  ComplianceControlMapperAgent.reset();
}
