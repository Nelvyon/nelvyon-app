import type { ILlmClient } from "../../LlmClient";
import type { HipaaComplianceInput, HipaaComplianceOutput } from "./shared";
import { getDefaultHipaaComplianceLlm, runHipaaComplianceAgentCore } from "./shared";

const AGENT_ID = "hipaacompliance-breachdetection";

export class BreachDetectionAgent {
  private static inst: BreachDetectionAgent | undefined;

  static get instance(): BreachDetectionAgent {
    if (!BreachDetectionAgent.inst) BreachDetectionAgent.inst = new BreachDetectionAgent();
    return BreachDetectionAgent.inst;
  }

  static reset(): void {
    BreachDetectionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHipaaComplianceLlm();
  }

  async run(input: HipaaComplianceInput): Promise<HipaaComplianceOutput> {
    const eliteRole = "Eres **Breach Detection** — brechas de datos de salud.";
    const mission =
      "Detecta **brechas de datos de salud** y **notifica reguladores automáticamente** en **<1 hora** (regulación 60 días).";
    const fewShot =
      '{"content":"Breach: detección salud, notificación reguladores <1 h","score":94,"highlights":["<1 h notify","Auto reguladores"],"metrics":["Breach notification time"]}';
    return runHipaaComplianceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBreachDetectionAgent(): BreachDetectionAgent {
  return BreachDetectionAgent.instance;
}

export function resetBreachDetectionAgentForTests(): void {
  BreachDetectionAgent.reset();
}
