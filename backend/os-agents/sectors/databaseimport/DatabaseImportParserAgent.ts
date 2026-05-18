import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-parser";

export class DatabaseImportParserAgent {
  private static inst: DatabaseImportParserAgent | undefined;

  static get instance(): DatabaseImportParserAgent {
    if (!DatabaseImportParserAgent.inst) DatabaseImportParserAgent.inst = new DatabaseImportParserAgent();
    return DatabaseImportParserAgent.inst;
  }

  static reset(): void {
    DatabaseImportParserAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Parser** — parseo automático de archivos.";
    const mission =
      "Parsea **CSV/Excel/JSON/XML/Google Sheets**; detecta columnas y **mapeo de campos**; 1M registros **<60s**.";
    const fewShot =
      '{"content":"Auto parse CSV Excel JSON XML Sheets column detection field mapping 1M <60s","score":90,"highlights":["1M <60s","Column mapping"],"metrics":["Parse throughput"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getDatabaseImportParserAgent(): DatabaseImportParserAgent {
  return DatabaseImportParserAgent.instance;
}

export function resetDatabaseImportParserAgentForTests(): void {
  DatabaseImportParserAgent.reset();
}
