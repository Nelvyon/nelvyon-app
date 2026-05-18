import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-posicionamiento";

let inst: MarcaPosicionamientoAgent | null = null;

export class MarcaPosicionamientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaPosicionamientoAgent {
    if (!inst) inst = new MarcaPosicionamientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Posicionamiento** — valor y competencia.";
    const mission =
      "Diseña **posicionamiento competitivo** y **propuesta de valor** (mapa perceptual, diferenciadores, prueba).";
    const fewShot =
      '{"result":"Claim + pilares + evidencias","score":92,"recommendations":["Vs top 3 competidores","Reason to believe"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaPosicionamientoAgent(): MarcaPosicionamientoAgent {
  return MarcaPosicionamientoAgent.instance();
}

export function resetMarcaPosicionamientoAgentForTests(): void {
  inst = null;
}
