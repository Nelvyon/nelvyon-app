import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-scoring";

export class DatabaseImportScoringAgent {
  private static inst: DatabaseImportScoringAgent | undefined;

  static get instance(): DatabaseImportScoringAgent {
    if (!DatabaseImportScoringAgent.inst) DatabaseImportScoringAgent.inst = new DatabaseImportScoringAgent();
    return DatabaseImportScoringAgent.inst;
  }

  static reset(): void {
    DatabaseImportScoringAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Scoring** — scoring masivo.";
    const mission =
      "Calcula **ICP fit y priorización** de contactos importados a escala.";
    const fewShot =
      '{"content":"Bulk ICP fit scoring contact list prioritization","score":88,"highlights":["ICP fit","List priority"],"metrics":["Scoring coverage"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getDatabaseImportScoringAgent(): DatabaseImportScoringAgent {
  return DatabaseImportScoringAgent.instance;
}

export function resetDatabaseImportScoringAgentForTests(): void {
  DatabaseImportScoringAgent.reset();
}
