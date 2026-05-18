import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-competidores";

let inst: InvestigadorCompetidoresAgent | null = null;

export class InvestigadorCompetidoresAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorCompetidoresAgent {
    if (!inst) inst = new InvestigadorCompetidoresAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Competidores** — radar vivo de pricing y posicionamiento.";
    const mission =
      "Construye **mapa competitivo** (ofertas, bundles, USP, gaps; fuentes; nivel de confianza por dato).";
    const fewShot =
      '{"result":"Matriz 5 players: precio medio, promo activa, USP","score":89,"recommendations":["Validar checkout","Evitar scraping TOS","Revisión legal claims"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorCompetidoresAgent(): InvestigadorCompetidoresAgent {
  return InvestigadorCompetidoresAgent.instance();
}

export function resetInvestigadorCompetidoresAgentForTests(): void {
  inst = null;
}
