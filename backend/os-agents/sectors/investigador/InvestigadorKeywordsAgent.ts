import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-keywords";

let inst: InvestigadorKeywordsAgent | null = null;

export class InvestigadorKeywordsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorKeywordsAgent {
    if (!inst) inst = new InvestigadorKeywordsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Keywords** — demanda SEO/SEM unificada.";
    const mission =
      "Entrega **mapa keywords** (intención, volumen relativo, competencia, clusters, cannibalización, estacionalidad).";
    const fewShot =
      '{"result":"Cluster 24 kw + prioridad paid/organic","score":90,"recommendations":["SERP features","Negativos brand","Landing 1:1"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorKeywordsAgent(): InvestigadorKeywordsAgent {
  return InvestigadorKeywordsAgent.instance();
}

export function resetInvestigadorKeywordsAgentForTests(): void {
  inst = null;
}
