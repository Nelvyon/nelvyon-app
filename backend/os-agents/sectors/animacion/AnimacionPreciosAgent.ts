import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-precios";

export class AnimacionPreciosAgent {
  private static inst: AnimacionPreciosAgent | undefined;

  static get instance(): AnimacionPreciosAgent {
    if (!AnimacionPreciosAgent.inst) AnimacionPreciosAgent.inst = new AnimacionPreciosAgent();
    return AnimacionPreciosAgent.inst;
  }

  static reset(): void {
    AnimacionPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación Precios** — proyectos 3D.";
    const mission = "Estructura **pricing de proyectos 3D** y paquetes por complejidad y entregables.";
    const fewShot =
      '{"result":"Pricing proyectos 3D + paquetes motion","score":91,"recommendations":["Tiers por segundos","Upsell VFX"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionPreciosAgent(): AnimacionPreciosAgent {
  return AnimacionPreciosAgent.instance;
}

export function resetAnimacionPreciosAgentForTests(): void {
  AnimacionPreciosAgent.reset();
}
