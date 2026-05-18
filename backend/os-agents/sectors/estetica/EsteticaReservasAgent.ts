import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-reservas";

export class EsteticaReservasAgent {
  private static inst: EsteticaReservasAgent | undefined;

  static get instance(): EsteticaReservasAgent {
    if (!EsteticaReservasAgent.inst) EsteticaReservasAgent.inst = new EsteticaReservasAgent();
    return EsteticaReservasAgent.inst;
  }

  static reset(): void {
    EsteticaReservasAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética Reservas** — citas online.";
    const mission = "Diseña **sistema de reservas online automatizado** con disponibilidad, recordatorios y no-show.";
    const fewShot =
      '{"result":"Reservas online automatizadas salón belleza","score":93,"recommendations":["Agenda 24/7","Buffer entre citas"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaReservasAgent(): EsteticaReservasAgent {
  return EsteticaReservasAgent.instance;
}

export function resetEsteticaReservasAgentForTests(): void {
  EsteticaReservasAgent.reset();
}
