import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-reviews";

let inst: DeporteReviewsAgent | null = null;

export class DeporteReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeporteReviewsAgent {
    if (!inst) inst = new DeporteReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte Reviews** — reputación y comunidad.";
    const mission =
      "Diseña **reputación del club/equipo** y **moderación de comunidad** (redes, foros, toxicidad, crisis deportiva).";
    const fewShot =
      '{"result":"Guía moderación + respuesta estándar","score":90,"recommendations":["Código conducta fans","Escalado incidente"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeporteReviewsAgent(): DeporteReviewsAgent {
  return DeporteReviewsAgent.instance();
}

export function resetDeporteReviewsAgentForTests(): void {
  inst = null;
}
