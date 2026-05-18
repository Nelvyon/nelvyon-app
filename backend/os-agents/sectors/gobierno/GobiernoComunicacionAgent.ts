import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-comunicacion";

let inst: GobiernoComunicacionAgent | null = null;

export class GobiernoComunicacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoComunicacionAgent {
    if (!inst) inst = new GobiernoComunicacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno Comunicación** — institucional y transparencia.";
    const mission =
      "Diseña **comunicación institucional** y **transparencia activa** (notas de prensa, portales, rendición de cuentas resumida).";
    const fewShot =
      '{"result":"Plan comunicación + calendario transparencia","score":93,"recommendations":["Datos abiertos resumidos","Portavoz único"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoComunicacionAgent(): GobiernoComunicacionAgent {
  return GobiernoComunicacionAgent.instance();
}

export function resetGobiernoComunicacionAgentForTests(): void {
  inst = null;
}
