import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-reviews";

let inst: FotografiaReviewsAgent | null = null;

export class FotografiaReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaReviewsAgent {
    if (!inst) inst = new FotografiaReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía Reviews** — reputación y testimonios.";
    const mission =
      "Diseña **reputación** y **testimonios** de clientes (Google, redes, página dedicada reseñas).";
    const fewShot =
      '{"result":"Script pedir review post-entrega","score":90,"recommendations":["Video 30s cliente","Badge Google"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaReviewsAgent(): FotografiaReviewsAgent {
  return FotografiaReviewsAgent.instance();
}

export function resetFotografiaReviewsAgentForTests(): void {
  inst = null;
}
