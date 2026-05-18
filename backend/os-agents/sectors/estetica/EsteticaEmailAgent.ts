import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-email";

export class EsteticaEmailAgent {
  private static inst: EsteticaEmailAgent | undefined;

  static get instance(): EsteticaEmailAgent {
    if (!EsteticaEmailAgent.inst) EsteticaEmailAgent.inst = new EsteticaEmailAgent();
    return EsteticaEmailAgent.inst;
  }

  static reset(): void {
    EsteticaEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética Email** — email y WhatsApp.";
    const mission = "Diseña **email + WhatsApp recordatorios de citas** y campañas de reactivación.";
    const fewShot =
      '{"result":"Email + WhatsApp recordatorios spa","score":90,"recommendations":["Recordatorio 24h","Rebooking 6 semanas"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaEmailAgent(): EsteticaEmailAgent {
  return EsteticaEmailAgent.instance;
}

export function resetEsteticaEmailAgentForTests(): void {
  EsteticaEmailAgent.reset();
}
