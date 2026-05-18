import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-replication";

export class BackupDisasterRecoveryReplicationAgent {
  private static inst: BackupDisasterRecoveryReplicationAgent | undefined;

  static get instance(): BackupDisasterRecoveryReplicationAgent {
    if (!BackupDisasterRecoveryReplicationAgent.inst)
      BackupDisasterRecoveryReplicationAgent.inst = new BackupDisasterRecoveryReplicationAgent();
    return BackupDisasterRecoveryReplicationAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoveryReplicationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery Replication** — replicación en tiempo real.";
    const mission =
      "Replica datos en **tiempo real** a región secundaria; **failover automático**; mínimo **2 zonas geográficas**.";
    const fewShot =
      '{"content":"Replicación RT: región secundaria, failover automático, 2+ zonas","score":95,"highlights":["Failover","Multi-zona"],"metrics":["Replication lag"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBackupDisasterRecoveryReplicationAgent(): BackupDisasterRecoveryReplicationAgent {
  return BackupDisasterRecoveryReplicationAgent.instance;
}

export function resetBackupDisasterRecoveryReplicationAgentForTests(): void {
  BackupDisasterRecoveryReplicationAgent.reset();
}
