import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-hipaareporting";

export class HipaaReportingAgent {
  private static inst: HipaaReportingAgent | undefined;

  static get instance(): HipaaReportingAgent {
    if (!HipaaReportingAgent.inst) HipaaReportingAgent.inst = new HipaaReportingAgent();
    return HipaaReportingAgent.inst;
  }

  static reset(): void {
    HipaaReportingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **HIPAA Reporting** — reportes y auditorías HHS.";
    const mission =
      "Genera **reportes de cumplimiento**, **auditorías HHS** y **documentación automática** con **compliance score >99%**.";
    const fewShot =
      '{"content":"HIPAA reporting: cumplimiento, auditorías HHS, documentación auto, >99%","score":91,"highlights":["HHS audits",">99% score"],"metrics":["Compliance reporting"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getHipaaReportingAgent(): HipaaReportingAgent {
  return HipaaReportingAgent.instance;
}

export function resetHipaaReportingAgentForTests(): void {
  HipaaReportingAgent.reset();
}
