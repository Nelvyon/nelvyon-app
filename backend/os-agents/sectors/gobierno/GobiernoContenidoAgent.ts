import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-contenido";

let inst: GobiernoContenidoAgent | null = null;

export class GobiernoContenidoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoContenidoAgent {
    if (!inst) inst = new GobiernoContenidoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno Contenido** — informativo y divulgación.";
    const mission =
      "Diseña **contenido informativo** y **divulgación** clara (trámites, servicios, campañas de sensibilización).";
    const fewShot =
      '{"result":"Mapa contenidos trámites + lenguaje claro","score":91,"recommendations":["Fichas paso a paso","Glosario ciudadano"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoContenidoAgent(): GobiernoContenidoAgent {
  return GobiernoContenidoAgent.instance();
}

export function resetGobiernoContenidoAgentForTests(): void {
  inst = null;
}
