import { DatabaseImportCleanerAgent } from "./DatabaseImportCleanerAgent";
import { DatabaseImportEnricherAgent } from "./DatabaseImportEnricherAgent";
import { DatabaseImportMappingAgent } from "./DatabaseImportMappingAgent";
import { DatabaseImportParserAgent } from "./DatabaseImportParserAgent";
import { DatabaseImportReportAgent } from "./DatabaseImportReportAgent";
import { DatabaseImportScoringAgent } from "./DatabaseImportScoringAgent";
import { DatabaseImportSegmentAgent } from "./DatabaseImportSegmentAgent";
import { DatabaseImportValidatorAgent } from "./DatabaseImportValidatorAgent";

export type { DatabaseImportInput, DatabaseImportOutput } from "./shared";
export { parseDatabaseImportLlmJson, buildDatabaseImportPrompt, llmOpts as databaseimportLlmOpts } from "./shared";

export {
  DatabaseImportParserAgent,
  getDatabaseImportParserAgent,
  resetDatabaseImportParserAgentForTests,
} from "./DatabaseImportParserAgent";
export {
  DatabaseImportValidatorAgent,
  getDatabaseImportValidatorAgent,
  resetDatabaseImportValidatorAgentForTests,
} from "./DatabaseImportValidatorAgent";
export {
  DatabaseImportCleanerAgent,
  getDatabaseImportCleanerAgent,
  resetDatabaseImportCleanerAgentForTests,
} from "./DatabaseImportCleanerAgent";
export {
  DatabaseImportSegmentAgent,
  getDatabaseImportSegmentAgent,
  resetDatabaseImportSegmentAgentForTests,
} from "./DatabaseImportSegmentAgent";
export {
  DatabaseImportEnricherAgent,
  getDatabaseImportEnricherAgent,
  resetDatabaseImportEnricherAgentForTests,
} from "./DatabaseImportEnricherAgent";
export {
  DatabaseImportScoringAgent,
  getDatabaseImportScoringAgent,
  resetDatabaseImportScoringAgentForTests,
} from "./DatabaseImportScoringAgent";
export {
  DatabaseImportMappingAgent,
  getDatabaseImportMappingAgent,
  resetDatabaseImportMappingAgentForTests,
} from "./DatabaseImportMappingAgent";
export {
  DatabaseImportReportAgent,
  getDatabaseImportReportAgent,
  resetDatabaseImportReportAgentForTests,
} from "./DatabaseImportReportAgent";

export function resetAllDatabaseImportAgentsForTests(): void {
  DatabaseImportParserAgent.reset();
  DatabaseImportValidatorAgent.reset();
  DatabaseImportCleanerAgent.reset();
  DatabaseImportSegmentAgent.reset();
  DatabaseImportEnricherAgent.reset();
  DatabaseImportScoringAgent.reset();
  DatabaseImportMappingAgent.reset();
  DatabaseImportReportAgent.reset();
}
