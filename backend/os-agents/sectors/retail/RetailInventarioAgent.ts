import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailinventario";

export class RetailInventarioAgent {
  private static inst: RetailInventarioAgent | undefined;

  static get instance(): RetailInventarioAgent {
    if (!RetailInventarioAgent.inst) RetailInventarioAgent.inst = new RetailInventarioAgent();
    return RetailInventarioAgent.inst;
  }

  static reset(): void {
    RetailInventarioAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Inventario** — stock y demanda.";
    const mission =
      "Gestiona **inventario con IA**, **predicción de demanda >88% accuracy** y **reposición automática**.";
    const fewShot =
      '{"content":"Inventario: IA, demanda >88%, reposición auto","score":95,"highlights":[">88% demanda","Reposición"],"metrics":["Demand accuracy"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailInventarioAgent(): RetailInventarioAgent {
  return RetailInventarioAgent.instance;
}

export function resetRetailInventarioAgentForTests(): void {
  RetailInventarioAgent.reset();
}
