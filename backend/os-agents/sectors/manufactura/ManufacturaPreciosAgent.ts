import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-precios";

let inst: ManufacturaPreciosAgent | null = null;

export class ManufacturaPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaPreciosAgent {
    if (!inst) inst = new ManufacturaPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura Precios** — industrial y márgenes.";
    const mission =
      "Diseña **pricing industrial**, listas por volumen y **márgenes** (descuentos canal, proyectos llave en mano).";
    const fewShot =
      '{"result":"Política precio por tier volumen","score":91,"recommendations":["Coste estándar vs real","Floor margin"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaPreciosAgent(): ManufacturaPreciosAgent {
  return ManufacturaPreciosAgent.instance();
}

export function resetManufacturaPreciosAgentForTests(): void {
  inst = null;
}
