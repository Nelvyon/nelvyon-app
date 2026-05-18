import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-precios";

let inst: Webs3dPreciosAgent | null = null;

export class Webs3dPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dPreciosAgent {
    if (!inst) inst = new Webs3dPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D Precios** — WebGL y AR/VR.";
    const mission =
      "Diseña **pricing** de proyectos **WebGL** y experiencias **AR/VR web** (sprints, licencias 3D, soporte).";
    const fewShot =
      '{"result":"Tabla MVP vs producción + SLA","score":91,"recommendations":["Fee optimización móvil","Add-on WebXR"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dPreciosAgent(): Webs3dPreciosAgent {
  return Webs3dPreciosAgent.instance();
}

export function resetWebs3dPreciosAgentForTests(): void {
  inst = null;
}
