import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-hipaatraining";

export class HipaaTrainingAgent {
  private static inst: HipaaTrainingAgent | undefined;

  static get instance(): HipaaTrainingAgent {
    if (!HipaaTrainingAgent.inst) HipaaTrainingAgent.inst = new HipaaTrainingAgent();
    return HipaaTrainingAgent.inst;
  }

  static reset(): void {
    HipaaTrainingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **HIPAA Training** — formación y certificaciones.";
    const mission =
      "Automatiza **training compliance**, **certificaciones** y **recordatorios** para mantener **compliance score >99%**.";
    const fewShot =
      '{"content":"HIPAA training: compliance auto, certificaciones, recordatorios, >99%","score":90,"highlights":[">99% compliance","Certificaciones"],"metrics":["Training compliance"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getHipaaTrainingAgent(): HipaaTrainingAgent {
  return HipaaTrainingAgent.instance;
}

export function resetHipaaTrainingAgentForTests(): void {
  HipaaTrainingAgent.reset();
}
