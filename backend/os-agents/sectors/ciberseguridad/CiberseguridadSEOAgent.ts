import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-seo";

export class CiberseguridadSEOAgent {
  private static inst: CiberseguridadSEOAgent | undefined;

  static get instance(): CiberseguridadSEOAgent {
    if (!CiberseguridadSEOAgent.inst) CiberseguridadSEOAgent.inst = new CiberseguridadSEOAgent();
    return CiberseguridadSEOAgent.inst;
  }

  static reset(): void {
    CiberseguridadSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad SEO** — contenido técnico.";
    const mission = "Diseña **SEO técnico** con contenido de ciberseguridad, glosarios y landings de intención.";
    const fewShot =
      '{"result":"SEO técnico vendor seguridad cloud","score":92,"recommendations":["Clusters MITRE","Pillar zero trust"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadSEOAgent(): CiberseguridadSEOAgent {
  return CiberseguridadSEOAgent.instance;
}

export function resetCiberseguridadSEOAgentForTests(): void {
  CiberseguridadSEOAgent.reset();
}
