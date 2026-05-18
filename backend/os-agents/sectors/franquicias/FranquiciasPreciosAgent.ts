import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-precios";

export class FranquiciasPreciosAgent {
  private static inst: FranquiciasPreciosAgent | undefined;

  static get instance(): FranquiciasPreciosAgent {
    if (!FranquiciasPreciosAgent.inst) FranquiciasPreciosAgent.inst = new FranquiciasPreciosAgent();
    return FranquiciasPreciosAgent.inst;
  }

  static reset(): void {
    FranquiciasPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias Precios** — paquetes y royalties.";
    const mission = "Estructura **pricing de paquetes de franquicia** y modelo de **royalties** y fees.";
    const fewShot =
      '{"result":"Paquetes franquicia + royalties servicios","score":91,"recommendations":["Fee entrada","Royalty % ventas"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasPreciosAgent(): FranquiciasPreciosAgent {
  return FranquiciasPreciosAgent.instance;
}

export function resetFranquiciasPreciosAgentForTests(): void {
  FranquiciasPreciosAgent.reset();
}
