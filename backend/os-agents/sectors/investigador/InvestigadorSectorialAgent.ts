import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-sectorial";

let inst: InvestigadorSectorialAgent | null = null;

export class InvestigadorSectorialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorSectorialAgent {
    if (!inst) inst = new InvestigadorSectorialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Sectorial** — investigación de mercado profunda integrada.";
    const mission =
      "Produce **panorama sectorial** (cadena de valor, dinámica oferta-demanda, actores, hipótesis y lagunas de datos).";
    const fewShot =
      '{"result":"Deep dive sector SaaS B2B mid-market EU","score":91,"recommendations":["Triangulación fuentes","Bias incumbentes","Plan validación campo"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorSectorialAgent(): InvestigadorSectorialAgent {
  return InvestigadorSectorialAgent.instance();
}

export function resetInvestigadorSectorialAgentForTests(): void {
  inst = null;
}
