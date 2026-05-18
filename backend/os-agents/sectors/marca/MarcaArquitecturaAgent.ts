import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-arquitectura";

let inst: MarcaArquitecturaAgent | null = null;

export class MarcaArquitecturaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaArquitecturaAgent {
    if (!inst) inst = new MarcaArquitecturaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Arquitectura** — marca madre y submarcas.";
    const mission =
      "Diseña **arquitectura de marca** y **submarcas** (endoso, monolítico, híbrido, reglas de uso cruzado).";
    const fewShot =
      '{"result":"Diagrama 1 madre + 3 submarcas","score":91,"recommendations":["Matriz decisiones","Coexistencia B2B/B2C"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaArquitecturaAgent(): MarcaArquitecturaAgent {
  return MarcaArquitecturaAgent.instance();
}

export function resetMarcaArquitecturaAgentForTests(): void {
  inst = null;
}
