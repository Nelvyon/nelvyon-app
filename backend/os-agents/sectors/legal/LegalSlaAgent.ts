import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-sla";

let inst: LegalSlaAgent | null = null;

export class LegalSlaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalSlaAgent {
    if (!inst) inst = new LegalSlaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal SLA OS** — acuerdos de nivel de servicio medibles.";
    const mission =
      "Diseña **SLA** con métricas (uptime, latencia, soporte), créditos de servicio, exclusión fuerza mayor, ventanas mantenimiento, reporting y revisión anual.";
    const fewShot =
      '{"result":"SLA 99.9% mensual con créditos escalonados","score":88,"recommendations":["Definición incidente","MTTR","Exclusión beta"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalSlaAgent(): LegalSlaAgent {
  return LegalSlaAgent.instance();
}

export function resetLegalSlaAgentForTests(): void {
  inst = null;
}
