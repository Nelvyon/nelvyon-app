import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-report";

export class IntegracionesNativasReportAgent {
  private static inst: IntegracionesNativasReportAgent | undefined;

  static get instance(): IntegracionesNativasReportAgent {
    if (!IntegracionesNativasReportAgent.inst) IntegracionesNativasReportAgent.inst = new IntegracionesNativasReportAgent();
    return IntegracionesNativasReportAgent.inst;
  }

  static reset(): void {
    IntegracionesNativasReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas Report** — reporting unificado cross-plataforma.";
    const mission =
      "Unifica **ROAS real**, **CPA total** y **LTV por fuente**; cálculo de ROAS en **tiempo real**.";
    const fewShot =
      '{"content":"Reporting unificado: ROAS real, CPA total, LTV por fuente, RT","score":93,"highlights":["ROAS unificado","LTV fuente"],"metrics":["Unified ROAS"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getIntegracionesNativasReportAgent(): IntegracionesNativasReportAgent {
  return IntegracionesNativasReportAgent.instance;
}

export function resetIntegracionesNativasReportAgentForTests(): void {
  IntegracionesNativasReportAgent.reset();
}
