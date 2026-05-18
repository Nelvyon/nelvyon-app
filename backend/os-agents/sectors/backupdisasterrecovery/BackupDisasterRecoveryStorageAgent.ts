import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-storage";

export class BackupDisasterRecoveryStorageAgent {
  private static inst: BackupDisasterRecoveryStorageAgent | undefined;

  static get instance(): BackupDisasterRecoveryStorageAgent {
    if (!BackupDisasterRecoveryStorageAgent.inst)
      BackupDisasterRecoveryStorageAgent.inst = new BackupDisasterRecoveryStorageAgent();
    return BackupDisasterRecoveryStorageAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoveryStorageAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery Storage** — gestión de almacenamiento de backups.";
    const mission =
      "Gestiona **compresión**, **encriptación AES-256** obligatoria y almacenamiento **multi-región** (mínimo 2 zonas).";
    const fewShot =
      '{"content":"Storage: compresión, AES-256, multi-región 2+ zonas","score":96,"highlights":["AES-256","Multi-región"],"metrics":["Storage compliance"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBackupDisasterRecoveryStorageAgent(): BackupDisasterRecoveryStorageAgent {
  return BackupDisasterRecoveryStorageAgent.instance;
}

export function resetBackupDisasterRecoveryStorageAgentForTests(): void {
  BackupDisasterRecoveryStorageAgent.reset();
}
