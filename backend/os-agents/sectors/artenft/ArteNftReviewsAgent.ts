import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-reviews";

let inst: ArteNftReviewsAgent | null = null;

export class ArteNftReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftReviewsAgent {
    if (!inst) inst = new ArteNftReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT Reviews** — reputación y prueba social.";
    const mission =
      "Diseña **reputación del artista** y **prueba social** (testimonios, prensa, verificación, curadores).";
    const fewShot =
      '{"result":"Kit prueba social + citas prensa","score":90,"recommendations":["Press quotes","Collector wall"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftReviewsAgent(): ArteNftReviewsAgent {
  return ArteNftReviewsAgent.instance();
}

export function resetArteNftReviewsAgentForTests(): void {
  inst = null;
}
