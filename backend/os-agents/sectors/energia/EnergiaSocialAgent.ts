import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-social";

let inst: EnergiaSocialAgent | null = null;

export class EnergiaSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaSocialAgent {
    if (!inst) inst = new EnergiaSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía Social** — sostenibilidad y ahorro.";
    const mission =
      "Diseña **social media** en torno a sostenibilidad, ahorro en factura y transición energética (sin greenwashing).";
    const fewShot =
      '{"result":"Calendario social ahorro + ESG","score":90,"recommendations":["Reels antes/después kWh","UGC clientes"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaSocialAgent(): EnergiaSocialAgent {
  return EnergiaSocialAgent.instance();
}

export function resetEnergiaSocialAgentForTests(): void {
  inst = null;
}
