import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-seo";

let inst: GamingSEOAgent | null = null;

export class GamingSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingSEOAgent {
    if (!inst) inst = new GamingSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming SEO** — stores y discoverability.";
    const mission =
      "Diseña **SEO gaming** y **visibilidad en stores** (keywords género, página Steam/Epic, blogs y wikis).";
    const fewShot =
      '{"result":"Hoja ruta tags Steam + blog dev","score":92,"recommendations":["Capsule A/B copy","Long-tail género"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingSEOAgent(): GamingSEOAgent {
  return GamingSEOAgent.instance();
}

export function resetGamingSEOAgentForTests(): void {
  inst = null;
}
