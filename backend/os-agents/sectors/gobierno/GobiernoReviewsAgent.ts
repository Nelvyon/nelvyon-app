import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-reviews";

let inst: GobiernoReviewsAgent | null = null;

export class GobiernoReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoReviewsAgent {
    if (!inst) inst = new GobiernoReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno Reviews** — reputación institucional.";
    const mission =
      "Diseña **reputación institucional** y lectura de **percepción ciudadana** (encuestas, medios, comentarios públicos).";
    const fewShot =
      '{"result":"Dashboard percepción + respuesta estándar","score":90,"recommendations":["NPS servicio","Tono empático"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoReviewsAgent(): GobiernoReviewsAgent {
  return GobiernoReviewsAgent.instance();
}

export function resetGobiernoReviewsAgentForTests(): void {
  inst = null;
}
