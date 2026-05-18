import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-incident-plan";

export class ComplianceIncidentPlanAgent {
  private static inst: ComplianceIncidentPlanAgent | undefined;

  static get instance(): ComplianceIncidentPlanAgent {
    if (!ComplianceIncidentPlanAgent.inst) ComplianceIncidentPlanAgent.inst = new ComplianceIncidentPlanAgent();
    return ComplianceIncidentPlanAgent.inst;
  }

  static reset(): void {
    ComplianceIncidentPlanAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: IR planning lead top 1%; planes trazables a A.16 / CC7 orientativos.",
      mission:
        "Genera plan de respuesta a incidentes compatible con el framework: roles, escalación, comunicaciones y lecciones aprendidas.",
      fewShotExample:
        '{"content":"COMPLY: detección→contención→erradicación→recuperación; retención evidencias forenses; notificación regulatoria si aplica región.","score":90,"controls":["Runbook ransomware versionado","Canal bridge guerra incidentes"],"gaps":["Sin tabla responsables fuera horario","Comunicación clientes sin plantilla aprobada"]}',
    }, input);
  }
}

export function getComplianceIncidentPlanAgent(): ComplianceIncidentPlanAgent {
  return ComplianceIncidentPlanAgent.instance;
}

export function resetComplianceIncidentPlanAgentForTests(): void {
  ComplianceIncidentPlanAgent.reset();
}
