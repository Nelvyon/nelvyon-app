import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-oportunidades";

let inst: InvestigadorOportunidadesAgent | null = null;

export class InvestigadorOportunidadesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorOportunidadesAgent {
    if (!inst) inst = new InvestigadorOportunidadesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Oportunidades** — white space accionable.";
    const mission =
      "Lista **oportunidades de mercado** (tamaño proxy, barreras entrada, dependencias, quick wins vs strategic).";
    const fewShot =
      '{"result":"Top 6 oportunidades con esfuerzo/impacto 2x2","score":86,"recommendations":["Validar willingness to pay","Riesgo copycat","MVP scope"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorOportunidadesAgent(): InvestigadorOportunidadesAgent {
  return InvestigadorOportunidadesAgent.instance();
}

export function resetInvestigadorOportunidadesAgentForTests(): void {
  inst = null;
}
