import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-email";

export class FranquiciasEmailAgent {
  private static inst: FranquiciasEmailAgent | undefined;

  static get instance(): FranquiciasEmailAgent {
    if (!FranquiciasEmailAgent.inst) FranquiciasEmailAgent.inst = new FranquiciasEmailAgent();
    return FranquiciasEmailAgent.inst;
  }

  static reset(): void {
    FranquiciasEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias Email** — central y clientes.";
    const mission = "Diseña **comunicación central–franquiciados** y campañas de email a clientes finales por red.";
    const fewShot =
      '{"result":"Email central-franquiciados + clientes","score":90,"recommendations":["Newsletter red","Playbooks locales"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasEmailAgent(): FranquiciasEmailAgent {
  return FranquiciasEmailAgent.instance;
}

export function resetFranquiciasEmailAgentForTests(): void {
  FranquiciasEmailAgent.reset();
}
