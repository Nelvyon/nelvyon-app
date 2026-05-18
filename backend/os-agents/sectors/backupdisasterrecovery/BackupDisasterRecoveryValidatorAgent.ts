import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-validator";

export class BackupDisasterRecoveryValidatorAgent {
  private static inst: BackupDisasterRecoveryValidatorAgent | undefined;

  static get instance(): BackupDisasterRecoveryValidatorAgent {
    if (!BackupDisasterRecoveryValidatorAgent.inst)
      BackupDisasterRecoveryValidatorAgent.inst = new BackupDisasterRecoveryValidatorAgent();
    return BackupDisasterRecoveryValidatorAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoveryValidatorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery Validator** — validación de integridad de backups.";
    const mission =
      "Valida integridad con **checksums** y ejecuta **test restore automático semanal**.";
    const fewShot =
      '{"content":"Validator: checksums, test restore automático semanal","score":97,"highlights":["Checksums","Test restore"],"metrics":["Integrity score"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBackupDisasterRecoveryValidatorAgent(): BackupDisasterRecoveryValidatorAgent {
  return BackupDisasterRecoveryValidatorAgent.instance;
}

export function resetBackupDisasterRecoveryValidatorAgentForTests(): void {
  BackupDisasterRecoveryValidatorAgent.reset();
}
