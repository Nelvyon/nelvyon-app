import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-comunidad";

let inst: GamingComunidadAgent | null = null;

export class GamingComunidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingComunidadAgent {
    if (!inst) inst = new GamingComunidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming Comunidad** — Discord, Reddit, Steam.";
    const mission =
      "Diseña **comunidad** en Discord, Reddit y Steam (moderación, eventos, feedback loop con devs).";
    const fewShot =
      '{"result":"Reglas servidor + AMA devs","score":92,"recommendations":["Canal changelog","Playtest cerrado"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingComunidadAgent(): GamingComunidadAgent {
  return GamingComunidadAgent.instance();
}

export function resetGamingComunidadAgentForTests(): void {
  inst = null;
}
