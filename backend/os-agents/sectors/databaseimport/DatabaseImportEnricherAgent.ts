import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-enricher";

export class DatabaseImportEnricherAgent {
  private static inst: DatabaseImportEnricherAgent | undefined;

  static get instance(): DatabaseImportEnricherAgent {
    if (!DatabaseImportEnricherAgent.inst) DatabaseImportEnricherAgent.inst = new DatabaseImportEnricherAgent();
    return DatabaseImportEnricherAgent.inst;
  }

  static reset(): void {
    DatabaseImportEnricherAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Enricher** — enriquecimiento masivo.";
    const mission =
      "Enriquece **empresa, cargo, LinkedIn y tecnografía** con cobertura **>85%** de registros importados.";
    const fewShot =
      '{"content":"Bulk enrich company title LinkedIn technographics >85% coverage","score":90,"highlights":[">85% enrichment","Technographics"],"metrics":["Enrichment rate"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getDatabaseImportEnricherAgent(): DatabaseImportEnricherAgent {
  return DatabaseImportEnricherAgent.instance;
}

export function resetDatabaseImportEnricherAgentForTests(): void {
  DatabaseImportEnricherAgent.reset();
}
