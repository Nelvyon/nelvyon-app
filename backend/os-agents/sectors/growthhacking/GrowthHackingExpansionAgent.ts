import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-expansion";

let inst: GrowthHackingExpansionAgent | null = null;

export class GrowthHackingExpansionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingExpansionAgent {
    if (!inst) inst = new GrowthHackingExpansionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Expansión** — upsell/cross-sell automático con ética.";
    const mission =
      "Define **expansión de revenue** (momentos de verdad, bundles, límites MAP, prueba social permitida).";
    const fewShot =
      '{"result":"3 plays upsell post-activación + cross SKU hermano","score":88,"recommendations":["No ocultar precio","Cancelación fácil","Revisión legal sector"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingExpansionAgent(): GrowthHackingExpansionAgent {
  return GrowthHackingExpansionAgent.instance();
}

export function resetGrowthHackingExpansionAgentForTests(): void {
  inst = null;
}
