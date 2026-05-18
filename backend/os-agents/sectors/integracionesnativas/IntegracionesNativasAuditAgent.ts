import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-audit";

export class IntegracionesNativasAuditAgent {
  private static inst: IntegracionesNativasAuditAgent | undefined;

  static get instance(): IntegracionesNativasAuditAgent {
    if (!IntegracionesNativasAuditAgent.inst) IntegracionesNativasAuditAgent.inst = new IntegracionesNativasAuditAgent();
    return IntegracionesNativasAuditAgent.inst;
  }

  static reset(): void {
    IntegracionesNativasAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas Audit** — auditoría de integraciones.";
    const mission =
      "Detecta **datos faltantes**, **discrepancias** y **gaps de tracking**; alertas en **<1h**.";
    const fewShot =
      '{"content":"Auditoría integraciones: datos faltantes, discrepancias, gaps tracking, <1h","score":96,"highlights":["Discrepancias","Gaps"],"metrics":["Audit detection time"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getIntegracionesNativasAuditAgent(): IntegracionesNativasAuditAgent {
  return IntegracionesNativasAuditAgent.instance;
}

export function resetIntegracionesNativasAuditAgentForTests(): void {
  IntegracionesNativasAuditAgent.reset();
}
