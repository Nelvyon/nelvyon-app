import type { ILlmClient } from "../../LlmClient";
import type { BackupDisasterRecoveryInput, BackupDisasterRecoveryOutput } from "./shared";
import { getDefaultBackupDisasterRecoveryLlm, runBackupDisasterRecoveryAgentCore } from "./shared";

const AGENT_ID = "backupdisasterrecovery-alert";

export class BackupDisasterRecoveryAlertAgent {
  private static inst: BackupDisasterRecoveryAlertAgent | undefined;

  static get instance(): BackupDisasterRecoveryAlertAgent {
    if (!BackupDisasterRecoveryAlertAgent.inst) BackupDisasterRecoveryAlertAgent.inst = new BackupDisasterRecoveryAlertAgent();
    return BackupDisasterRecoveryAlertAgent.inst;
  }

  static reset(): void {
    BackupDisasterRecoveryAlertAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBackupDisasterRecoveryLlm();
  }

  async run(input: BackupDisasterRecoveryInput): Promise<BackupDisasterRecoveryOutput> {
    const eliteRole = "Eres **BackupDisasterRecovery Alert** — alertas de fallos y riesgos.";
    const mission =
      "Alerta **fallos de backup**, **espacio en disco** y **corrupción detectada**; escalado inmediato.";
    const fewShot =
      '{"content":"Alertas: fallos backup, espacio disco, corrupción detectada","score":95,"highlights":["Fallos","Corrupción"],"metrics":["Alert response"]}';
    return runBackupDisasterRecoveryAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBackupDisasterRecoveryAlertAgent(): BackupDisasterRecoveryAlertAgent {
  return BackupDisasterRecoveryAlertAgent.instance;
}

export function resetBackupDisasterRecoveryAlertAgentForTests(): void {
  BackupDisasterRecoveryAlertAgent.reset();
}
