import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-social";

let inst: ArteNftSocialAgent | null = null;

export class ArteNftSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftSocialAgent {
    if (!inst) inst = new ArteNftSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT Social** — Instagram, X y TikTok.";
    const mission =
      "Diseña **social** en Instagram, **Twitter/X** y **TikTok** para arte (reels proceso, drops, colabs).";
    const fewShot =
      '{"result":"Calendario reels WIP + countdown drop","score":90,"recommendations":["Carousel obra","Thread hilo técnico"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftSocialAgent(): ArteNftSocialAgent {
  return ArteNftSocialAgent.instance();
}

export function resetArteNftSocialAgentForTests(): void {
  inst = null;
}
