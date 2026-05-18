import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-seo";

let inst: ArquitecturaSEOAgent | null = null;

export class ArquitecturaSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaSEOAgent {
    if (!inst) inst = new ArquitecturaSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura SEO** — local e interiorismo.";
    const mission =
      "Diseña **SEO local** para estudio de arquitectura e **interiorismo** (Google Business, proyectos por zona).";
    const fewShot =
      '{"result":"Clusters reformas + barrio","score":92,"recommendations":["Proyecto por ciudad","FAQ licencias"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaSEOAgent(): ArquitecturaSEOAgent {
  return ArquitecturaSEOAgent.instance();
}

export function resetArquitecturaSEOAgentForTests(): void {
  inst = null;
}
