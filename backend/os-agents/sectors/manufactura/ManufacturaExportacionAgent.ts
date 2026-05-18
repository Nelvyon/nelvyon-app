import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-exportacion";

let inst: ManufacturaExportacionAgent | null = null;

export class ManufacturaExportacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaExportacionAgent {
    if (!inst) inst = new ManufacturaExportacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura Exportación** — mercados internacionales.";
    const mission =
      "Diseña **estrategia de exportación** y priorización de **mercados internacionales** (incoterms resumidos, canal, ferias).";
    const fewShot =
      '{"result":"Roadmap export 3 mercados","score":92,"recommendations":["Matriz país-riesgo","Partner local"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaExportacionAgent(): ManufacturaExportacionAgent {
  return ManufacturaExportacionAgent.instance();
}

export function resetManufacturaExportacionAgentForTests(): void {
  inst = null;
}
