import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-social";

let inst: ManufacturaSocialAgent | null = null;

export class ManufacturaSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaSocialAgent {
    if (!inst) inst = new ManufacturaSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura Social** — LinkedIn industrial.";
    const mission =
      "Diseña **LinkedIn y social B2B** con **casos de uso**, línea de producción (sin datos sensibles de clientes).";
    const fewShot =
      '{"result":"Calendario thought leadership planta","score":90,"recommendations":["Post caso ROI","Video proceso 60s"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaSocialAgent(): ManufacturaSocialAgent {
  return ManufacturaSocialAgent.instance();
}

export function resetManufacturaSocialAgentForTests(): void {
  inst = null;
}
