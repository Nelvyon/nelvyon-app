import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-reviews";

let inst: ArquitecturaReviewsAgent | null = null;

export class ArquitecturaReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaReviewsAgent {
    if (!inst) inst = new ArquitecturaReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura Reviews** — reputación y testimonios.";
    const mission =
      "Diseña **reputación** del estudio y **testimonios** de clientes (Google, Houzz, casos con foto).";
    const fewShot =
      '{"result":"Script pedir review post-entrega","score":90,"recommendations":["Video testimonio corto","NPS interno"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaReviewsAgent(): ArquitecturaReviewsAgent {
  return ArquitecturaReviewsAgent.instance();
}

export function resetArquitecturaReviewsAgentForTests(): void {
  inst = null;
}
