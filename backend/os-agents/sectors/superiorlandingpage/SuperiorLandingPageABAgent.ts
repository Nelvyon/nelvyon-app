import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-ab";

export class SuperiorLandingPageABAgent {
  private static inst: SuperiorLandingPageABAgent | undefined;

  static get instance(): SuperiorLandingPageABAgent {
    if (!SuperiorLandingPageABAgent.inst) SuperiorLandingPageABAgent.inst = new SuperiorLandingPageABAgent();
    return SuperiorLandingPageABAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPageABAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage AB** — variantes A/B automáticas.";
    const mission =
      "Genera **variantes A/B** con hipótesis de test y métricas de éxito; lanzamiento automático **en 48h**.";
    const fewShot =
      '{"content":"Auto A/B variants hypotheses success metrics launch in 48h","score":87,"highlights":["48h A/B launch","Test hypotheses"],"metrics":["Experiment velocity"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getSuperiorLandingPageABAgent(): SuperiorLandingPageABAgent {
  return SuperiorLandingPageABAgent.instance;
}

export function resetSuperiorLandingPageABAgentForTests(): void {
  SuperiorLandingPageABAgent.reset();
}
