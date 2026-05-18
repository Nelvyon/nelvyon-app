import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-reviews";

let inst: SegurosReviewsAgent | null = null;

export class SegurosReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosReviewsAgent {
    if (!inst) inst = new SegurosReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros Reviews** — reputación y testimonios.";
    const mission =
      "Diseña **reputación online** y **testimonios de clientes** post-siniestro o post-contratación (ética y veracidad).";
    const fewShot =
      '{"result":"Playbook solicitud reseña post-cierre","score":90,"recommendations":["NPS correduría","Video testimonio"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosReviewsAgent(): SegurosReviewsAgent {
  return SegurosReviewsAgent.instance();
}

export function resetSegurosReviewsAgentForTests(): void {
  inst = null;
}
