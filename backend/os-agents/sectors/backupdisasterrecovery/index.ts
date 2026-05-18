import { BackupDisasterRecoveryAlertAgent } from "./BackupDisasterRecoveryAlertAgent";
import { BackupDisasterRecoveryReplicationAgent } from "./BackupDisasterRecoveryReplicationAgent";
import { BackupDisasterRecoveryReportAgent } from "./BackupDisasterRecoveryReportAgent";
import { BackupDisasterRecoveryRestoreAgent } from "./BackupDisasterRecoveryRestoreAgent";
import { BackupDisasterRecoveryRPOAgent } from "./BackupDisasterRecoveryRPOAgent";
import { BackupDisasterRecoverySchedulerAgent } from "./BackupDisasterRecoverySchedulerAgent";
import { BackupDisasterRecoveryStorageAgent } from "./BackupDisasterRecoveryStorageAgent";
import { BackupDisasterRecoveryValidatorAgent } from "./BackupDisasterRecoveryValidatorAgent";

export type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
export {
  parseBackupDisasterRecoveryLlmJson,
  buildBackupDisasterRecoveryPrompt,
  llmOpts as backupdisasterrecoveryLlmOpts,
} from "./shared";

export {
  BackupDisasterRecoverySchedulerAgent,
  getBackupDisasterRecoverySchedulerAgent,
  resetBackupDisasterRecoverySchedulerAgentForTests,
} from "./BackupDisasterRecoverySchedulerAgent";
export {
  BackupDisasterRecoveryStorageAgent,
  getBackupDisasterRecoveryStorageAgent,
  resetBackupDisasterRecoveryStorageAgentForTests,
} from "./BackupDisasterRecoveryStorageAgent";
export {
  BackupDisasterRecoveryValidatorAgent,
  getBackupDisasterRecoveryValidatorAgent,
  resetBackupDisasterRecoveryValidatorAgentForTests,
} from "./BackupDisasterRecoveryValidatorAgent";
export {
  BackupDisasterRecoveryRestoreAgent,
  getBackupDisasterRecoveryRestoreAgent,
  resetBackupDisasterRecoveryRestoreAgentForTests,
} from "./BackupDisasterRecoveryRestoreAgent";
export {
  BackupDisasterRecoveryAlertAgent,
  getBackupDisasterRecoveryAlertAgent,
  resetBackupDisasterRecoveryAlertAgentForTests,
} from "./BackupDisasterRecoveryAlertAgent";
export {
  BackupDisasterRecoveryRPOAgent,
  getBackupDisasterRecoveryRPOAgent,
  resetBackupDisasterRecoveryRPOAgentForTests,
} from "./BackupDisasterRecoveryRPOAgent";
export {
  BackupDisasterRecoveryReplicationAgent,
  getBackupDisasterRecoveryReplicationAgent,
  resetBackupDisasterRecoveryReplicationAgentForTests,
} from "./BackupDisasterRecoveryReplicationAgent";
export {
  BackupDisasterRecoveryReportAgent,
  getBackupDisasterRecoveryReportAgent,
  resetBackupDisasterRecoveryReportAgentForTests,
} from "./BackupDisasterRecoveryReportAgent";

export function resetAllBackupDisasterRecoveryAgentsForTests(): void {
  BackupDisasterRecoverySchedulerAgent.reset();
  BackupDisasterRecoveryStorageAgent.reset();
  BackupDisasterRecoveryValidatorAgent.reset();
  BackupDisasterRecoveryRestoreAgent.reset();
  BackupDisasterRecoveryAlertAgent.reset();
  BackupDisasterRecoveryRPOAgent.reset();
  BackupDisasterRecoveryReplicationAgent.reset();
  BackupDisasterRecoveryReportAgent.reset();
}
