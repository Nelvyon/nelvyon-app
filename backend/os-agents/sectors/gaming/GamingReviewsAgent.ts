import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-reviews";

let inst: GamingReviewsAgent | null = null;

export class GamingReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingReviewsAgent {
    if (!inst) inst = new GamingReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming Reviews** — Steam, Metacritic y prensa.";
    const mission =
      "Diseña **estrategia de reviews** Steam/Metacritic y **press kit** (embargo, keys, mensajes clave).";
    const fewShot =
      '{"result":"Press kit + lista medios indie","score":90,"recommendations":["Key art consistente","Seguimiento curadores"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingReviewsAgent(): GamingReviewsAgent {
  return GamingReviewsAgent.instance();
}

export function resetGamingReviewsAgentForTests(): void {
  inst = null;
}
