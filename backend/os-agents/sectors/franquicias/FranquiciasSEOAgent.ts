import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-seo";

export class FranquiciasSEOAgent {
  private static inst: FranquiciasSEOAgent | undefined;

  static get instance(): FranquiciasSEOAgent {
    if (!FranquiciasSEOAgent.inst) FranquiciasSEOAgent.inst = new FranquiciasSEOAgent();
    return FranquiciasSEOAgent.inst;
  }

  static reset(): void {
    FranquiciasSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias SEO** — nacional y local.";
    const mission = "Diseña **SEO nacional + local por franquiciado** con plantillas y evitar canibalización.";
    const fewShot =
      '{"result":"SEO nacional + local por tienda franquicia","score":92,"recommendations":["Subdominios locales","Schema LocalBusiness"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasSEOAgent(): FranquiciasSEOAgent {
  return FranquiciasSEOAgent.instance;
}

export function resetFranquiciasSEOAgentForTests(): void {
  FranquiciasSEOAgent.reset();
}
