import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-clientes";

export class AnimacionClientesAgent {
  private static inst: AnimacionClientesAgent | undefined;

  static get instance(): AnimacionClientesAgent {
    if (!AnimacionClientesAgent.inst) AnimacionClientesAgent.inst = new AnimacionClientesAgent();
    return AnimacionClientesAgent.inst;
  }

  static reset(): void {
    AnimacionClientesAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación Clientes** — estudios y marcas.";
    const mission = "Define **captación de estudios, agencias y marcas** con propuestas y embudos B2B.";
    const fewShot =
      '{"result":"Captación agencias + marcas estudio 3D","score":92,"recommendations":["Outreach agencias","Paquete pitch"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionClientesAgent(): AnimacionClientesAgent {
  return AnimacionClientesAgent.instance;
}

export function resetAnimacionClientesAgentForTests(): void {
  AnimacionClientesAgent.reset();
}
