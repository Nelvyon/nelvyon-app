import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-restore";

export class BackupDisasterRecoveryRestoreAgent {
  private static inst: BackupDisasterRecoveryRestoreAgent | undefined;

  static get instance(): BackupDisasterRecoveryRestoreAgent {
    if (!BackupDisasterRecoveryRestoreAgent.inst)
      BackupDisasterRecoveryRestoreAgent.inst = new BackupDisasterRecoveryRestoreAgent();
    return BackupDisasterRecoveryRestoreAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoveryRestoreAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery Restore** — restauración automática.";
    const mission =
      "Restaura a **punto exacto en el tiempo**; soporta **restauración parcial**; RTO objetivo **<4h**.";
    const fewShot =
      '{"content":"Restore: punto en el tiempo, restauración parcial, RTO <4h","score":94,"highlights":["PITR","RTO <4h"],"metrics":["Restore time"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBackupDisasterRecoveryRestoreAgent(): BackupDisasterRecoveryRestoreAgent {
  return BackupDisasterRecoveryRestoreAgent.instance;
}

export function resetBackupDisasterRecoveryRestoreAgentForTests(): void {
  BackupDisasterRecoveryRestoreAgent.reset();
}
