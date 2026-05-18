import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-tendencias";

let inst: InvestigadorTendenciasAgent | null = null;

export class InvestigadorTendenciasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorTendenciasAgent {
    if (!inst) inst = new InvestigadorTendenciasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Tendencias** — señales por país y región.";
    const mission =
      "Sintetiza **tendencias sector** (regulación, estacionalidad, consumo, riesgos geopolíticos, supuestos explícitos).";
    const fewShot =
      '{"result":"Pulse EU+LATAM: 4 tendencias + 2 contrarian","score":87,"recommendations":["Fecha corte","Fuente primaria","No extrapolar sin datos"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorTendenciasAgent(): InvestigadorTendenciasAgent {
  return InvestigadorTendenciasAgent.instance();
}

export function resetInvestigadorTendenciasAgentForTests(): void {
  inst = null;
}
