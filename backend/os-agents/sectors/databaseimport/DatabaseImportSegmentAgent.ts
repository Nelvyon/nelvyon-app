import type { ILlmClient } from "../../LlmClient";
import type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
import { getDefaultDatabaseImportLlm, runDatabaseImportAgentCore } from "./shared";

const AGENT_ID = "databaseimport-segment";

export class DatabaseImportSegmentAgent {
  private static inst: DatabaseImportSegmentAgent | undefined;

  static get instance(): DatabaseImportSegmentAgent {
    if (!DatabaseImportSegmentAgent.inst) DatabaseImportSegmentAgent.inst = new DatabaseImportSegmentAgent();
    return DatabaseImportSegmentAgent.inst;
  }

  static reset(): void {
    DatabaseImportSegmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDatabaseImportLlm();
  }

  async run(input: DatabaseImportInput): Promise<DatabaseImportOutput> {
    const eliteRole = "Eres **DatabaseImport Segment** — segmentación automática.";
    const mission =
      "Segmenta por **comportamiento, demografía, valor y fase del ciclo de vida** en **<10s** tras import.";
    const fewShot =
      '{"content":"Auto segment behavior demographics value lifecycle <10s post-import","score":89,"highlights":["<10s segmentation","Lifecycle segments"],"metrics":["Segment count"]}';
    return runDatabaseImportAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getDatabaseImportSegmentAgent(): DatabaseImportSegmentAgent {
  return DatabaseImportSegmentAgent.instance;
}

export function resetDatabaseImportSegmentAgentForTests(): void {
  DatabaseImportSegmentAgent.reset();
}
