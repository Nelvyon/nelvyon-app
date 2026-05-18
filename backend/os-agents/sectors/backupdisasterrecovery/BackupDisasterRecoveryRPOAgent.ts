import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-rpo";

export class BackupDisasterRecoveryRPOAgent {
  private static inst: BackupDisasterRecoveryRPOAgent | undefined;

  static get instance(): BackupDisasterRecoveryRPOAgent {
    if (!BackupDisasterRecoveryRPOAgent.inst) BackupDisasterRecoveryRPOAgent.inst = new BackupDisasterRecoveryRPOAgent();
    return BackupDisasterRecoveryRPOAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoveryRPOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery RPO** — gestión RPO/RTO.";
    const mission =
      "Garantiza **RPO <1h** (máximo 1h de datos perdidos) y **RTO <4h** (recuperación en menos de 4h).";
    const fewShot =
      '{"content":"RPO/RTO: RPO <1h, RTO <4h, objetivos SLA","score":96,"highlights":["RPO <1h","RTO <4h"],"metrics":["RPO compliance"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBackupDisasterRecoveryRPOAgent(): BackupDisasterRecoveryRPOAgent {
  return BackupDisasterRecoveryRPOAgent.instance;
}

export function resetBackupDisasterRecoveryRPOAgentForTests(): void {
  BackupDisasterRecoveryRPOAgent.reset();
}
