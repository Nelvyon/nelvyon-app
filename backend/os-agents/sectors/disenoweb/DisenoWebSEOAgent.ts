import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebseo";

export class DisenoWebSEOAgent {
  private static inst: DisenoWebSEOAgent | undefined;

  static get instance(): DisenoWebSEOAgent {
    if (!DisenoWebSEOAgent.inst) DisenoWebSEOAgent.inst = new DisenoWebSEOAgent();
    return DisenoWebSEOAgent.inst;
  }

  static reset(): void {
    DisenoWebSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web SEO** — técnica y rendimiento.";
    const mission =
      "Optimiza **técnica SEO**, **Core Web Vitals**, **PageSpeed >95** móvil/desktop y **estructura** del sitio.";
    const fewShot =
      '{"content":"SEO técnico: CWV, PageSpeed >95, estructura","score":96,"highlights":[">95 PageSpeed","CWV"],"metrics":["PageSpeed score"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebSEOAgent(): DisenoWebSEOAgent {
  return DisenoWebSEOAgent.instance;
}

export function resetDisenoWebSEOAgentForTests(): void {
  DisenoWebSEOAgent.reset();
}
