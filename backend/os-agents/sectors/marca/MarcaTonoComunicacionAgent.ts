import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-tono-comunicacion";

let inst: MarcaTonoComunicacionAgent | null = null;

export class MarcaTonoComunicacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaTonoComunicacionAgent {
    if (!inst) inst = new MarcaTonoComunicacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Tono de comunicación** — voz y guía.";
    const mission =
      "Diseña **tono de voz** y **guía de comunicación** (registro, léxico, ejemplos por canal y situación).";
    const fewShot =
      '{"result":"Matriz tono crisis vs lanzamiento","score":91,"recommendations":["Frases modelo","Palabras veto"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaTonoComunicacionAgent(): MarcaTonoComunicacionAgent {
  return MarcaTonoComunicacionAgent.instance();
}

export function resetMarcaTonoComunicacionAgentForTests(): void {
  inst = null;
}
