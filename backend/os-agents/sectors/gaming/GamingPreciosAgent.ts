import type { ILlmClient } from "../../LlmClient";
import type { GamingInput, GamingOutput } from "./shared";
import { getDefaultGamingLlm, runGamingAgentCore } from "./shared";

const AGENT_ID = "gaming-precios";

let inst: GamingPreciosAgent | null = null;

export class GamingPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GamingPreciosAgent {
    if (!inst) inst = new GamingPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGamingLlm();
  }

  async run(input: GamingInput): Promise<GamingOutput> {
    const eliteRole = "Eres **Gaming Precios** — juego, DLC y battle pass.";
    const mission =
      "Diseña **pricing** del juego, **DLCs**, **battle pass** y monetización (bundles, regional pricing resumido).";
    const fewShot =
      '{"result":"Matriz precio base + season pass","score":91,"recommendations":["Edición deluxe valor","Cosméticos only"]}';
    return runGamingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGamingPreciosAgent(): GamingPreciosAgent {
  return GamingPreciosAgent.instance();
}

export function resetGamingPreciosAgentForTests(): void {
  inst = null;
}
