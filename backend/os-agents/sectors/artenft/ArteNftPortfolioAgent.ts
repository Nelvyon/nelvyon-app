import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-portfolio";

let inst: ArteNftPortfolioAgent | null = null;

export class ArteNftPortfolioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftPortfolioAgent {
    if (!inst) inst = new ArteNftPortfolioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT Portfolio** — galería online y curaduría.";
    const mission =
      "Diseña **portfolio digital** y **galería online** (narrativa visual, secciones, UX y coherencia de marca).";
    const fewShot =
      '{"result":"Estructura portfolio + moodboard digital","score":93,"recommendations":["Serie temática","High-res consistente"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftPortfolioAgent(): ArteNftPortfolioAgent {
  return ArteNftPortfolioAgent.instance();
}

export function resetArteNftPortfolioAgentForTests(): void {
  inst = null;
}
