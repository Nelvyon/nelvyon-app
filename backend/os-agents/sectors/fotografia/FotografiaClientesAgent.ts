import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-clientes";

let inst: FotografiaClientesAgent | null = null;

export class FotografiaClientesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaClientesAgent {
    if (!inst) inst = new FotografiaClientesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía Clientes** — captación por especialidad.";
    const mission =
      "Diseña **captación de clientes** por **especialidad** (bodas, producto, inmo, moda — mensajes y canales).";
    const fewShot =
      '{"result":"ICP por vertical + oferta entrada","score":92,"recommendations":["Mini sesión producto","Colab wedding planner"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaClientesAgent(): FotografiaClientesAgent {
  return FotografiaClientesAgent.instance();
}

export function resetFotografiaClientesAgentForTests(): void {
  inst = null;
}
