import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-baaagreement";

export class BAAAgreementAgent {
  private static inst: BAAAgreementAgent | undefined;

  static get instance(): BAAAgreementAgent {
    if (!BAAAgreementAgent.inst) BAAAgreementAgent.inst = new BAAAgreementAgent();
    return BAAAgreementAgent.inst;
  }

  static reset(): void {
    BAAAgreementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **BAA Agreement** — Business Associate Agreements.";
    const mission =
      "Gestiona **BAA automáticamente**, **renovaciones** y **firma automática** sin intervención manual.";
    const fewShot =
      '{"content":"BAA: gestión auto, renovaciones, firma automática","score":92,"highlights":["BAA auto","Firma automática"],"metrics":["BAA automation"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getBAAAgreementAgent(): BAAAgreementAgent {
  return BAAAgreementAgent.instance;
}

export function resetBAAAgreementAgentForTests(): void {
  BAAAgreementAgent.reset();
}
