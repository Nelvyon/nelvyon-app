import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-report";

export class TechnicalSeoAuditReportAgent {
  private static inst: TechnicalSeoAuditReportAgent | undefined;

  static get instance(): TechnicalSeoAuditReportAgent {
    if (!TechnicalSeoAuditReportAgent.inst) TechnicalSeoAuditReportAgent.inst = new TechnicalSeoAuditReportAgent();
    return TechnicalSeoAuditReportAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit Report** — informe de auditoría priorizado.";
    const mission =
      "Entrega errores **críticos/medios/bajos**, **roadmap de fixes** e **impacto SEO estimado** con código exacto.";
    const fewShot =
      '{"content":"Report: crítico/medio/bajo, roadmap fixes, impacto SEO, código exacto","score":86,"highlights":["Priorización","Roadmap"],"metrics":["Critical issues"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getTechnicalSeoAuditReportAgent(): TechnicalSeoAuditReportAgent {
  return TechnicalSeoAuditReportAgent.instance;
}

export function resetTechnicalSeoAuditReportAgentForTests(): void {
  TechnicalSeoAuditReportAgent.reset();
}
