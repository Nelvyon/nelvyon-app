import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-portfolio";

let inst: FotografiaPortfolioAgent | null = null;

export class FotografiaPortfolioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaPortfolioAgent {
    if (!inst) inst = new FotografiaPortfolioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía Portfolio** — galería online.";
    const mission =
      "Diseña **portfolio online** y **galería visual optimizada** (categorías, velocidad, storytelling por serie).";
    const fewShot =
      '{"result":"Arquitectura web galería + lazy load","score":93,"recommendations":["Serie bodas 2025","CTA contacto sticky"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaPortfolioAgent(): FotografiaPortfolioAgent {
  return FotografiaPortfolioAgent.instance();
}

export function resetFotografiaPortfolioAgentForTests(): void {
  inst = null;
}
