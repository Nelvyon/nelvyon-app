import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailprecios";

export class RetailPreciosAgent {
  private static inst: RetailPreciosAgent | undefined;

  static get instance(): RetailPreciosAgent {
    if (!RetailPreciosAgent.inst) RetailPreciosAgent.inst = new RetailPreciosAgent();
    return RetailPreciosAgent.inst;
  }

  static reset(): void {
    RetailPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Precios** — pricing dinámico.";
    const mission =
      "Aplica **pricing dinámico**, **comparativa de competencia cada 24 h** y **optimización de margen**.";
    const fewShot =
      '{"content":"Precios: dinámico, competencia 24 h, margen","score":94,"highlights":["Refresh 24 h","Margen"],"metrics":["Price refresh SLA"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailPreciosAgent(): RetailPreciosAgent {
  return RetailPreciosAgent.instance;
}

export function resetRetailPreciosAgentForTests(): void {
  RetailPreciosAgent.reset();
}
