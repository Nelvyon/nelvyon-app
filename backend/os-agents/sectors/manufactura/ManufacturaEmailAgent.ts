import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-email";

let inst: ManufacturaEmailAgent | null = null;

export class ManufacturaEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaEmailAgent {
    if (!inst) inst = new ManufacturaEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura Email** — B2B industrial.";
    const mission =
      "Diseña **email B2B industrial** y **nurturing** largo (RFI, muestras, visitas técnicas, seguimiento post-feria).";
    const fewShot =
      '{"result":"Secuencia 6 toques post-lead","score":91,"recommendations":["Trigger RFQ abierto","Newsletter capacidad"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaEmailAgent(): ManufacturaEmailAgent {
  return ManufacturaEmailAgent.instance();
}

export function resetManufacturaEmailAgentForTests(): void {
  inst = null;
}
