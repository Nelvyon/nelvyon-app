import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-precios";

export class EsteticaPreciosAgent {
  private static inst: EsteticaPreciosAgent | undefined;

  static get instance(): EsteticaPreciosAgent {
    if (!EsteticaPreciosAgent.inst) EsteticaPreciosAgent.inst = new EsteticaPreciosAgent();
    return EsteticaPreciosAgent.inst;
  }

  static reset(): void {
    EsteticaPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética Precios** — servicios y paquetes.";
    const mission = "Estructura **pricing de servicios y paquetes** con upsells, combos y estacionalidad.";
    const fewShot =
      '{"result":"Pricing servicios + paquetes barbershop","score":91,"recommendations":["Menú por niveles","Combo corte+barba"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaPreciosAgent(): EsteticaPreciosAgent {
  return EsteticaPreciosAgent.instance;
}

export function resetEsteticaPreciosAgentForTests(): void {
  EsteticaPreciosAgent.reset();
}
