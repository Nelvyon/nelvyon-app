import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailfidelizacion";

export class RetailFidelizacionAgent {
  private static inst: RetailFidelizacionAgent | undefined;

  static get instance(): RetailFidelizacionAgent {
    if (!RetailFidelizacionAgent.inst) RetailFidelizacionAgent.inst = new RetailFidelizacionAgent();
    return RetailFidelizacionAgent.inst;
  }

  static reset(): void {
    RetailFidelizacionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Fidelización** — loyalty automático.";
    const mission =
      "Opera **puntos, cashback y cumpleaños** con **segmentación automática** sin intervención manual.";
    const fewShot =
      '{"content":"Fidelización: puntos, cashback, cumpleaños, segmentación auto","score":93,"highlights":["Sin intervención","Puntos auto"],"metrics":["Loyalty engagement"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailFidelizacionAgent(): RetailFidelizacionAgent {
  return RetailFidelizacionAgent.instance;
}

export function resetRetailFidelizacionAgentForTests(): void {
  RetailFidelizacionAgent.reset();
}
