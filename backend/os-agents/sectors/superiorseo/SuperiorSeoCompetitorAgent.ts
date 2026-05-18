import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-competitor";

export class SuperiorSeoCompetitorAgent {
  private static inst: SuperiorSeoCompetitorAgent | undefined;

  static get instance(): SuperiorSeoCompetitorAgent {
    if (!SuperiorSeoCompetitorAgent.inst) SuperiorSeoCompetitorAgent.inst = new SuperiorSeoCompetitorAgent();
    return SuperiorSeoCompetitorAgent.inst;
  }

  static reset(): void {
    SuperiorSeoCompetitorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo Competitor Analyst** — gaps y estrategia rival.";
    const mission =
      "Analiza **competidores**: **gaps de keywords**, **backlinks rivales** y **estrategia de contenido** rival; cannibalization automática.";
    const fewShot =
      '{"content":"Competitor keyword gaps, backlink delta, content strategy","score":88,"highlights":["Keyword gaps","Cannibalization"],"metrics":["Gap count"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorSeoCompetitorAgent(): SuperiorSeoCompetitorAgent {
  return SuperiorSeoCompetitorAgent.instance;
}

export function resetSuperiorSeoCompetitorAgentForTests(): void {
  SuperiorSeoCompetitorAgent.reset();
}
