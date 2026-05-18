import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-perception";

let inst: MarcaPerceptionAgent | null = null;

export class MarcaPerceptionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaPerceptionAgent {
    if (!inst) inst = new MarcaPerceptionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Perception** — percepción y competencia.";
    const mission =
      "Diseña **percepción de marca** y **análisis competitivo** (atributos, gaps, oportunidades de reposicionamiento).";
    const fewShot =
      '{"result":"Mapa atributos vs 4 competidores","score":92,"recommendations":["Social listening","Survey NPS cualitativo"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaPerceptionAgent(): MarcaPerceptionAgent {
  return MarcaPerceptionAgent.instance();
}

export function resetMarcaPerceptionAgentForTests(): void {
  inst = null;
}
