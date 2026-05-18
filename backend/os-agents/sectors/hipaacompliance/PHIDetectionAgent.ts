import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-phidetection";

export class PHIDetectionAgent {
  private static inst: PHIDetectionAgent | undefined;

  static get instance(): PHIDetectionAgent {
    if (!PHIDetectionAgent.inst) PHIDetectionAgent.inst = new PHIDetectionAgent();
    return PHIDetectionAgent.inst;
  }

  static reset(): void {
    PHIDetectionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **PHI Detection** — detección y clasificación de PHI.";
    const mission =
      "Detecta y clasifica **PHI** en **datos**, **emails** y **documentos** en **<1 segundo**; **0 PHI expuesto sin cifrar**.";
    const fewShot =
      '{"content":"PHI detection: datos, emails, docs, <1 s, 0 expuesto","score":94,"highlights":["<1 s detect","0 PHI claro"],"metrics":["PHI detection latency"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPHIDetectionAgent(): PHIDetectionAgent {
  return PHIDetectionAgent.instance;
}

export function resetPHIDetectionAgentForTests(): void {
  PHIDetectionAgent.reset();
}
