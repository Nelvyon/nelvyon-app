import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-report";

export class DatabaseImportReportAgent {
  private static inst: DatabaseImportReportAgent | undefined;

  static get instance(): DatabaseImportReportAgent {
    if (!DatabaseImportReportAgent.inst) DatabaseImportReportAgent.inst = new DatabaseImportReportAgent();
    return DatabaseImportReportAgent.inst;
  }

  static reset(): void {
    DatabaseImportReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Report** — informe post-import.";
    const mission =
      "Informa **registros procesados, errores, calidad de datos y segmentos creados**.";
    const fewShot =
      '{"content":"Post-import report processed records errors data quality segments","score":89,"highlights":["Processed count","Data quality"],"metrics":["Report completeness"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getDatabaseImportReportAgent(): DatabaseImportReportAgent {
  return DatabaseImportReportAgent.instance;
}

export function resetDatabaseImportReportAgentForTests(): void {
  DatabaseImportReportAgent.reset();
}
