import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-seo";

let inst: SegurosSEOAgent | null = null;

export class SegurosSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosSEOAgent {
    if (!inst) inst = new SegurosSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros SEO** — comparadores e intención.";
    const mission =
      "Diseña **SEO para comparadores** y **búsquedas de intención de compra** (long-tail por ramo y localidad).";
    const fewShot =
      '{"result":"Pilar SEO comparador + local","score":92,"recommendations":["FAQ coberturas genéricas","Schema FAQ"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosSEOAgent(): SegurosSEOAgent {
  return SegurosSEOAgent.instance();
}

export function resetSegurosSEOAgentForTests(): void {
  inst = null;
}
