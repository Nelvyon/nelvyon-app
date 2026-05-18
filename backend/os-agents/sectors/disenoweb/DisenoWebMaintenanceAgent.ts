import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebmaintenance";

export class DisenoWebMaintenanceAgent {
  private static inst: DisenoWebMaintenanceAgent | undefined;

  static get instance(): DisenoWebMaintenanceAgent {
    if (!DisenoWebMaintenanceAgent.inst) DisenoWebMaintenanceAgent.inst = new DisenoWebMaintenanceAgent();
    return DisenoWebMaintenanceAgent.inst;
  }

  static reset(): void {
    DisenoWebMaintenanceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web Maintenance** — mantenimiento automático.";
    const mission =
      "Ejecuta **mantenimiento automático**, **actualizaciones, backups y uptime** con **0 intervención humana**.";
    const fewShot =
      '{"content":"Mantenimiento: auto, updates, backups, uptime, 0 humano","score":95,"highlights":["100% auto","Uptime"],"metrics":["Maintenance automation"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebMaintenanceAgent(): DisenoWebMaintenanceAgent {
  return DisenoWebMaintenanceAgent.instance;
}

export function resetDisenoWebMaintenanceAgentForTests(): void {
  DisenoWebMaintenanceAgent.reset();
}
