import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-retencion";

let inst: EnergiaRetencionAgent | null = null;

export class EnergiaRetencionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaRetencionAgent {
    if (!inst) inst = new EnergiaRetencionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía Retención** — churn energético.";
    const mission =
      "Diseña **retención y reducción de churn** (win-back, precio indexado, servicios valor añadido, autoconsumo).";
    const fewShot =
      '{"result":"Retención tarifa + valor servicio","score":91,"recommendations":["Alerta precio mercado","Loyalty solar"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaRetencionAgent(): EnergiaRetencionAgent {
  return EnergiaRetencionAgent.instance();
}

export function resetEnergiaRetencionAgentForTests(): void {
  inst = null;
}
