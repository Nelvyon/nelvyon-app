import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-conversion";

export class SuperiorLandingPageConversionAgent {
  private static inst: SuperiorLandingPageConversionAgent | undefined;

  static get instance(): SuperiorLandingPageConversionAgent {
    if (!SuperiorLandingPageConversionAgent.inst) SuperiorLandingPageConversionAgent.inst = new SuperiorLandingPageConversionAgent();
    return SuperiorLandingPageConversionAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPageConversionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage Conversion** — CRO automático.";
    const mission =
      "Detecta **fricciones CRO**, sugiere mejoras con impacto estimado; objetivo **CVR >8%** y score **≥90/100**.";
    const fewShot =
      '{"content":"Auto CRO friction detection improvements estimated impact CVR >8%","score":91,"highlights":["CRO score 90+","Friction fixes"],"metrics":["CVR uplift"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getSuperiorLandingPageConversionAgent(): SuperiorLandingPageConversionAgent {
  return SuperiorLandingPageConversionAgent.instance;
}

export function resetSuperiorLandingPageConversionAgentForTests(): void {
  SuperiorLandingPageConversionAgent.reset();
}
