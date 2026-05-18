import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-clientes";

let inst: Webs3dClientesAgent | null = null;

export class Webs3dClientesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dClientesAgent {
    if (!inst) inst = new Webs3dClientesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D Clientes** — marcas y agencias.";
    const mission =
      "Diseña **captación de marcas y agencias** para proyectos inmersivos (RFP, pilotos, partnerships creativos).";
    const fewShot =
      '{"result":"Pitch deck interactivo + vertical retail","score":92,"recommendations":["POC 2 semanas","Case study métricas"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dClientesAgent(): Webs3dClientesAgent {
  return Webs3dClientesAgent.instance();
}

export function resetWebs3dClientesAgentForTests(): void {
  inst = null;
}
