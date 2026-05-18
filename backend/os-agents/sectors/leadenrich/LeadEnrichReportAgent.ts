import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-report";

export class LeadEnrichReportAgent {
  private static inst: LeadEnrichReportAgent | undefined;

  static get instance(): LeadEnrichReportAgent {
    if (!LeadEnrichReportAgent.inst) LeadEnrichReportAgent.inst = new LeadEnrichReportAgent();
    return LeadEnrichReportAgent.inst;
  }

  static reset(): void {
    LeadEnrichReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich Pipeline Reporter** — visión ejecutiva del embudo enriquecido.";
    const mission =
      "Genera **reporte de pipeline**: leads por segmento (ICP/MQL/SQL/no-fit), **score medio** y **conversion rate** del enriquecimiento.";
    const fewShot =
      '{"content":"Pipeline: 42% MQL, avg score 62, conv 18%","score":85,"highlights":["Segment mix","Avg score"],"metrics":["Conversion rate"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getLeadEnrichReportAgent(): LeadEnrichReportAgent {
  return LeadEnrichReportAgent.instance;
}

export function resetLeadEnrichReportAgentForTests(): void {
  LeadEnrichReportAgent.reset();
}
