import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-seo";

export class MultiIdiomaSEOAgent {
  private static inst: MultiIdiomaSEOAgent | undefined;

  static get instance(): MultiIdiomaSEOAgent {
    if (!MultiIdiomaSEOAgent.inst) MultiIdiomaSEOAgent.inst = new MultiIdiomaSEOAgent();
    return MultiIdiomaSEOAgent.inst;
  }

  static reset(): void {
    MultiIdiomaSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma SEO** — SEO multiidioma automatizado.";
    const mission =
      "Implementa **hreflang** automático, **keywords locales** y **meta tags** por idioma para indexación internacional.";
    const fewShot =
      '{"content":"SEO multiidioma: hreflang, keywords locales, meta tags por idioma","score":92,"highlights":["Hreflang auto","Keywords locales"],"metrics":["Hreflang coverage"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getMultiIdiomaSEOAgent(): MultiIdiomaSEOAgent {
  return MultiIdiomaSEOAgent.instance;
}

export function resetMultiIdiomaSEOAgentForTests(): void {
  MultiIdiomaSEOAgent.reset();
}
