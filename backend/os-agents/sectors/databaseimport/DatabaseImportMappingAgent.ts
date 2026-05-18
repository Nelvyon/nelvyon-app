import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-mapping";

export class DatabaseImportMappingAgent {
  private static inst: DatabaseImportMappingAgent | undefined;

  static get instance(): DatabaseImportMappingAgent {
    if (!DatabaseImportMappingAgent.inst) DatabaseImportMappingAgent.inst = new DatabaseImportMappingAgent();
    return DatabaseImportMappingAgent.inst;
  }

  static reset(): void {
    DatabaseImportMappingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Mapping** — mapeo inteligente de campos.";
    const mission =
      "Mapea **campos origen → campos NELVYON** con sugerencias automáticas.";
    const fewShot =
      '{"content":"Smart source to NELVYON field mapping auto suggestions","score":87,"highlights":["Field mapping","Auto suggestions"],"metrics":["Mapping accuracy"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getDatabaseImportMappingAgent(): DatabaseImportMappingAgent {
  return DatabaseImportMappingAgent.instance;
}

export function resetDatabaseImportMappingAgentForTests(): void {
  DatabaseImportMappingAgent.reset();
}
