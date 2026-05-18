import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-keyword";

export class SuperiorSeoKeywordAgent {
  private static inst: SuperiorSeoKeywordAgent | undefined;

  static get instance(): SuperiorSeoKeywordAgent {
    if (!SuperiorSeoKeywordAgent.inst) SuperiorSeoKeywordAgent.inst = new SuperiorSeoKeywordAgent();
    return SuperiorSeoKeywordAgent.inst;
  }

  static reset(): void {
    SuperiorSeoKeywordAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo Keyword Strategist** — clusters y long-tail.";
    const mission =
      "Investiga **keywords**: volumen, dificultad, intención, **clusters semánticos** y **oportunidades long-tail**; objetivo top 3 <90d.";
    const fewShot =
      '{"content":"Keyword clusters + long-tail map, intent labeled","score":90,"highlights":["Semantic clusters","Long-tail"],"metrics":["Target keywords"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorSeoKeywordAgent(): SuperiorSeoKeywordAgent {
  return SuperiorSeoKeywordAgent.instance;
}

export function resetSuperiorSeoKeywordAgentForTests(): void {
  SuperiorSeoKeywordAgent.reset();
}
