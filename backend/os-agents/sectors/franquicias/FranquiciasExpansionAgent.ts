import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-expansion";

export class FranquiciasExpansionAgent {
  private static inst: FranquiciasExpansionAgent | undefined;

  static get instance(): FranquiciasExpansionAgent {
    if (!FranquiciasExpansionAgent.inst) FranquiciasExpansionAgent.inst = new FranquiciasExpansionAgent();
    return FranquiciasExpansionAgent.inst;
  }

  static reset(): void {
    FranquiciasExpansionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias Expansión** — nuevos franquiciados.";
    const mission = "Diseña **captación de nuevos franquiciados** con perfil ideal, funnel y materiales de expansión.";
    const fewShot =
      '{"result":"Captación nuevos franquiciados cadena retail","score":93,"recommendations":["Web franquicia","Discovery day"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasExpansionAgent(): FranquiciasExpansionAgent {
  return FranquiciasExpansionAgent.instance;
}

export function resetFranquiciasExpansionAgentForTests(): void {
  FranquiciasExpansionAgent.reset();
}
