import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-seo";

let inst: Webs3dSEOAgent | null = null;

export class Webs3dSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dSEOAgent {
    if (!inst) inst = new Webs3dSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D SEO** — experiencias y 3D web.";
    const mission =
      "Diseña **SEO** para **experiencias web** y **visualización 3D** (landings, schema, contenido técnico indexable).";
    const fewShot =
      '{"result":"Guía keywords configurador 3D","score":92,"recommendations":["Blog WebGL vs nativo","FAQ rendimiento"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dSEOAgent(): Webs3dSEOAgent {
  return Webs3dSEOAgent.instance();
}

export function resetWebs3dSEOAgentForTests(): void {
  inst = null;
}
