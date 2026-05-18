import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-hipaaaudit";

export class HipaaAuditAgent {
  private static inst: HipaaAuditAgent | undefined;

  static get instance(): HipaaAuditAgent {
    if (!HipaaAuditAgent.inst) HipaaAuditAgent.inst = new HipaaAuditAgent();
    return HipaaAuditAgent.inst;
  }

  static reset(): void {
    HipaaAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **HIPAA Audit** — auditoría automática de cumplimiento.";
    const mission =
      "Ejecuta **auditoría HIPAA automática**, **gap analysis** y **risk score** en **<10 minutos**; **compliance score >99%**.";
    const fewShot =
      '{"content":"HIPAA audit: gap analysis, risk score, <10 min, >99% compliance","score":95,"highlights":["<10 min audit",">99% score"],"metrics":["Compliance score"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.15);
  }
}

export function getHipaaAuditAgent(): HipaaAuditAgent {
  return HipaaAuditAgent.instance;
}

export function resetHipaaAuditAgentForTests(): void {
  HipaaAuditAgent.reset();
}
