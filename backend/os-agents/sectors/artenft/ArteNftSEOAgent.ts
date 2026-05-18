import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-seo";

let inst: ArteNftSEOAgent | null = null;

export class ArteNftSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftSEOAgent {
    if (!inst) inst = new ArteNftSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT SEO** — arte digital y marketplaces.";
    const mission =
      "Diseña **SEO arte digital** y **marketplaces** (metadatos colección, descripciones, enlaces y discoverability).";
    const fewShot =
      '{"result":"Guía keywords género + traits","score":92,"recommendations":["Blog proceso creativo","Schema artist"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftSEOAgent(): ArteNftSEOAgent {
  return ArteNftSEOAgent.instance();
}

export function resetArteNftSEOAgentForTests(): void {
  inst = null;
}
