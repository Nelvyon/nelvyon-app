import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-lead-gen";

let inst: ManufacturaLeadGenAgent | null = null;

export class ManufacturaLeadGenAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaLeadGenAgent {
    if (!inst) inst = new ManufacturaLeadGenAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura Lead Gen** — clientes industriales B2B.";
    const mission =
      "Diseña **captación de clientes industriales B2B** (ABM ligero, RFQ, visitas planta, partners canal).";
    const fewShot =
      '{"result":"Embudo B2B industrial + ICP","score":93,"recommendations":["Lista target vertical","Lead magnet datasheet"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaLeadGenAgent(): ManufacturaLeadGenAgent {
  return ManufacturaLeadGenAgent.instance();
}

export function resetManufacturaLeadGenAgentForTests(): void {
  inst = null;
}
