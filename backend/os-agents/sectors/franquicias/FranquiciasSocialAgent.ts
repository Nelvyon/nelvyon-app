import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-social";

export class FranquiciasSocialAgent {
  private static inst: FranquiciasSocialAgent | undefined;

  static get instance(): FranquiciasSocialAgent {
    if (!FranquiciasSocialAgent.inst) FranquiciasSocialAgent.inst = new FranquiciasSocialAgent();
    return FranquiciasSocialAgent.inst;
  }

  static reset(): void {
    FranquiciasSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias Social** — marca y local.";
    const mission = "Planifica **redes sociales de marca + contenido local** por unidad con guías y calendario.";
    const fewShot =
      '{"result":"Social marca + contenido local franquicia","score":91,"recommendations":["Plantillas reels","UGC local"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasSocialAgent(): FranquiciasSocialAgent {
  return FranquiciasSocialAgent.instance;
}

export function resetFranquiciasSocialAgentForTests(): void {
  FranquiciasSocialAgent.reset();
}
