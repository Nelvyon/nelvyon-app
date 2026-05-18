import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-scheduler";

export class BackupDisasterRecoverySchedulerAgent {
  private static inst: BackupDisasterRecoverySchedulerAgent | undefined;

  static get instance(): BackupDisasterRecoverySchedulerAgent {
    if (!BackupDisasterRecoverySchedulerAgent.inst)
      BackupDisasterRecoverySchedulerAgent.inst = new BackupDisasterRecoverySchedulerAgent();
    return BackupDisasterRecoverySchedulerAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoverySchedulerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery Scheduler** — backups automáticos programados.";
    const mission =
      "Programa backups **cada hora**, **diario**, **semanal** y **mensual**; retención 30 días diarios y 12 meses mensuales.";
    const fewShot =
      '{"content":"Scheduler: hora, diario, semanal, mensual; retención 30d/12m","score":95,"highlights":["Programado","Retención"],"metrics":["Backup schedule"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBackupDisasterRecoverySchedulerAgent(): BackupDisasterRecoverySchedulerAgent {
  return BackupDisasterRecoverySchedulerAgent.instance;
}

export function resetBackupDisasterRecoverySchedulerAgentForTests(): void {
  BackupDisasterRecoverySchedulerAgent.reset();
}
