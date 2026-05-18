import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-okrtracking";

export class OKRTrackingAgent {
  private static inst: OKRTrackingAgent | undefined;

  static get instance(): OKRTrackingAgent {
    if (!OKRTrackingAgent.inst) OKRTrackingAgent.inst = new OKRTrackingAgent();
    return OKRTrackingAgent.inst;
  }

  static reset(): void {
    OKRTrackingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **OKR Tracking** — seguimiento de key results.";
    const mission =
      "Sigue **KRs en tiempo real**, **progreso** y **alertas de desvío**; actualización automática **cada 24 horas**; alerta **<1 h**.";
    const fewShot =
      '{"content":"OKR tracking: KRs RT, progreso, desvío <1 h, update 24 h","score":91,"highlights":["Update 24 h","Desvío <1 h"],"metrics":["KR tracking"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getOKRTrackingAgent(): OKRTrackingAgent {
  return OKRTrackingAgent.instance;
}

export function resetOKRTrackingAgentForTests(): void {
  OKRTrackingAgent.reset();
}
