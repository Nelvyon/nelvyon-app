import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-validator";

export class DatabaseImportValidatorAgent {
  private static inst: DatabaseImportValidatorAgent | undefined;

  static get instance(): DatabaseImportValidatorAgent {
    if (!DatabaseImportValidatorAgent.inst) DatabaseImportValidatorAgent.inst = new DatabaseImportValidatorAgent();
    return DatabaseImportValidatorAgent.inst;
  }

  static reset(): void {
    DatabaseImportValidatorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Validator** — validación de datos.";
    const mission =
      "Valida **duplicados, emails inválidos, campos vacíos y formatos**; cobertura **100%** de registros.";
    const fewShot =
      '{"content":"Validate duplicates invalid emails empty fields formats 100% records","score":92,"highlights":["100% validation","Format checks"],"metrics":["Validation coverage"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getDatabaseImportValidatorAgent(): DatabaseImportValidatorAgent {
  return DatabaseImportValidatorAgent.instance;
}

export function resetDatabaseImportValidatorAgentForTests(): void {
  DatabaseImportValidatorAgent.reset();
}
