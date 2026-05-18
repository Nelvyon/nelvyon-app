import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-portfolio";

let inst: ArquitecturaPortfolioAgent | null = null;

export class ArquitecturaPortfolioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaPortfolioAgent {
    if (!inst) inst = new ArquitecturaPortfolioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura Portfolio** — proyectos y galería.";
    const mission =
      "Diseña **portfolio de proyectos** y **galería visual** (narrativa por tipología, antes/después, storytelling).";
    const fewShot =
      '{"result":"Estructura web portfolio + casos","score":93,"recommendations":["Serie reforma integral","Créditos fotógrafo"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaPortfolioAgent(): ArquitecturaPortfolioAgent {
  return ArquitecturaPortfolioAgent.instance();
}

export function resetArquitecturaPortfolioAgentForTests(): void {
  inst = null;
}
