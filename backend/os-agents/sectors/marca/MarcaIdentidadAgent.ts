import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-identidad";

let inst: MarcaIdentidadAgent | null = null;

export class MarcaIdentidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaIdentidadAgent {
    if (!inst) inst = new MarcaIdentidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Identidad** — sistema visual y guidelines.";
    const mission =
      "Diseña **identidad visual** y **brand guidelines** (logo, color, tipografía, aplicaciones digitales e impresas).";
    const fewShot =
      '{"result":"Manual marca 20pp + grid digital","score":93,"recommendations":["Tokens diseño","Ejemplos DO/DONT"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaIdentidadAgent(): MarcaIdentidadAgent {
  return MarcaIdentidadAgent.instance();
}

export function resetMarcaIdentidadAgentForTests(): void {
  inst = null;
}
