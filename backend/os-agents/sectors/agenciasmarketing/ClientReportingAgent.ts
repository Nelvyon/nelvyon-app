import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-clientreporting";

export class ClientReportingAgent {
  private static inst: ClientReportingAgent | undefined;

  static get instance(): ClientReportingAgent {
    if (!ClientReportingAgent.inst) ClientReportingAgent.inst = new ClientReportingAgent();
    return ClientReportingAgent.inst;
  }

  static reset(): void {
    ClientReportingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **Client Reporting** — reportes white-label.";
    const mission =
      "Genera **reportes cliente automáticos white-label** con **métricas clave por canal** en **<2 minutos** y retención **>90%**.";
    const fewShot =
      '{"content":"Reporting: white-label, métricas por canal, <2 min, retención >90%","score":95,"highlights":["<2 min reporte",">90% retención"],"metrics":["Report turnaround"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getClientReportingAgent(): ClientReportingAgent {
  return ClientReportingAgent.instance;
}

export function resetClientReportingAgentForTests(): void {
  ClientReportingAgent.reset();
}
