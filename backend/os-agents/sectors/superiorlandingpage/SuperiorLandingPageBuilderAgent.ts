import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-builder";

export class SuperiorLandingPageBuilderAgent {
  private static inst: SuperiorLandingPageBuilderAgent | undefined;

  static get instance(): SuperiorLandingPageBuilderAgent {
    if (!SuperiorLandingPageBuilderAgent.inst) SuperiorLandingPageBuilderAgent.inst = new SuperiorLandingPageBuilderAgent();
    return SuperiorLandingPageBuilderAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPageBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage Builder** — landings completas por sector.";
    const mission =
      "Genera **landing pages completas** por sector/objetivo con estructura **CRO probada**; entrega **<15s**; score CRO **≥90**.";
    const fewShot =
      '{"content":"Full landing by sector with proven CRO structure <15s build","score":91,"highlights":[">8% CVR target","CRO score 90+"],"metrics":["Build latency"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorLandingPageBuilderAgent(): SuperiorLandingPageBuilderAgent {
  return SuperiorLandingPageBuilderAgent.instance;
}

export function resetSuperiorLandingPageBuilderAgentForTests(): void {
  SuperiorLandingPageBuilderAgent.reset();
}
