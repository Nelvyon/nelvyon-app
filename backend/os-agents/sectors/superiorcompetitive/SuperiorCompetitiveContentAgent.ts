import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-content";

export class SuperiorCompetitiveContentAgent {
  private static inst: SuperiorCompetitiveContentAgent | undefined;

  static get instance(): SuperiorCompetitiveContentAgent {
    if (!SuperiorCompetitiveContentAgent.inst) SuperiorCompetitiveContentAgent.inst = new SuperiorCompetitiveContentAgent();
    return SuperiorCompetitiveContentAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitiveContentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Content** — contenido y SEO rival.";
    const mission =
      "Analiza **contenido y SEO competidores**, **gaps de keywords** y estrategia de respuesta editorial.";
    const fewShot =
      '{"content":"Rival SEO and content gaps, keyword response plan","score":86,"highlights":["Keyword gaps","Response strategy"],"metrics":["Content coverage"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorCompetitiveContentAgent(): SuperiorCompetitiveContentAgent {
  return SuperiorCompetitiveContentAgent.instance;
}

export function resetSuperiorCompetitiveContentAgentForTests(): void {
  SuperiorCompetitiveContentAgent.reset();
}
