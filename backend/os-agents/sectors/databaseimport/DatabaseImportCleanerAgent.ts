import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-cleaner";

export class DatabaseImportCleanerAgent {
  private static inst: DatabaseImportCleanerAgent | undefined;

  static get instance(): DatabaseImportCleanerAgent {
    if (!DatabaseImportCleanerAgent.inst) DatabaseImportCleanerAgent.inst = new DatabaseImportCleanerAgent();
    return DatabaseImportCleanerAgent.inst;
  }

  static reset(): void {
    DatabaseImportCleanerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Cleaner** — limpieza automática.";
    const mission =
      "Normaliza **nombres, teléfonos y países**; elimina duplicados con accuracy **>99%**.";
    const fewShot =
      '{"content":"Normalize names phones countries dedupe >99% accuracy","score":91,"highlights":[">99% dedupe","Normalization"],"metrics":["Dedup accuracy"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getDatabaseImportCleanerAgent(): DatabaseImportCleanerAgent {
  return DatabaseImportCleanerAgent.instance;
}

export function resetDatabaseImportCleanerAgentForTests(): void {
  DatabaseImportCleanerAgent.reset();
}
