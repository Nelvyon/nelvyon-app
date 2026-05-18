import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-lanzamiento";

let inst: GamingLanzamientoAgent | null = null;

export class GamingLanzamientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingLanzamientoAgent {
    if (!inst) inst = new GamingLanzamientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming Lanzamiento** — release y wishlists.";
    const mission =
      "Diseña **estrategia de lanzamiento** del juego y **wishlists** (fechas, beats de prensa, demos, festivales).";
    const fewShot =
      '{"result":"Timeline launch + hitos wishlist","score":93,"recommendations":["Next Fest Steam","Trailer date drop"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingLanzamientoAgent(): GamingLanzamientoAgent {
  return GamingLanzamientoAgent.instance();
}

export function resetGamingLanzamientoAgentForTests(): void {
  inst = null;
}
