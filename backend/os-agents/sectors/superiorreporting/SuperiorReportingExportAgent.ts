import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-export";

export class SuperiorReportingExportAgent {
  private static inst: SuperiorReportingExportAgent | undefined;

  static get instance(): SuperiorReportingExportAgent {
    if (!SuperiorReportingExportAgent.inst) SuperiorReportingExportAgent.inst = new SuperiorReportingExportAgent();
    return SuperiorReportingExportAgent.inst;
  }

  static reset(): void {
    SuperiorReportingExportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Export** — exportación multi-formato.";
    const mission =
      "Exporta informes a **PDF/CSV/Sheets/PowerPoint** con branding del cliente; entrega **<10s**.";
    const fewShot =
      '{"content":"Branded PDF CSV Sheets PowerPoint export <10s","score":86,"highlights":["<10s export","Client branding"],"metrics":["Export latency"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorReportingExportAgent(): SuperiorReportingExportAgent {
  return SuperiorReportingExportAgent.instance;
}

export function resetSuperiorReportingExportAgentForTests(): void {
  SuperiorReportingExportAgent.reset();
}
