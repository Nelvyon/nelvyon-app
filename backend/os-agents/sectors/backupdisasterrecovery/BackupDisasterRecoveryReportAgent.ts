import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-report";

export class BackupDisasterRecoveryReportAgent {
  private static inst: BackupDisasterRecoveryReportAgent | undefined;

  static get instance(): BackupDisasterRecoveryReportAgent {
    if (!BackupDisasterRecoveryReportAgent.inst) BackupDisasterRecoveryReportAgent.inst = new BackupDisasterRecoveryReportAgent();
    return BackupDisasterRecoveryReportAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoveryReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery Report** — informes de backup y cumplimiento.";
    const mission =
      "Informa **historial**, **tamaños**, **éxitos/fallos** y **cumplimiento SLA** de backup y DR.";
    const fewShot =
      '{"content":"Informe backup: historial, tamaños, éxitos/fallos, SLA","score":93,"highlights":["Historial","SLA"],"metrics":["Backup SLA"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getBackupDisasterRecoveryReportAgent(): BackupDisasterRecoveryReportAgent {
  return BackupDisasterRecoveryReportAgent.instance;
}

export function resetBackupDisasterRecoveryReportAgentForTests(): void {
  BackupDisasterRecoveryReportAgent.reset();
}
