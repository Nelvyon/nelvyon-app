import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-social";

let inst: FotografiaSocialAgent | null = null;

export class FotografiaSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaSocialAgent {
    if (!inst) inst = new FotografiaSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía Social** — Instagram, Pinterest y TikTok.";
    const mission =
      "Diseña **social visual** en Instagram, **Pinterest** y **TikTok** (reels behind camera, tableros por estilo).";
    const fewShot =
      '{"result":"Calendario reels BTS + moodboard","score":90,"recommendations":["Carousel antes/después","Pin vertical producto"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaSocialAgent(): FotografiaSocialAgent {
  return FotografiaSocialAgent.instance();
}

export function resetFotografiaSocialAgentForTests(): void {
  inst = null;
}
