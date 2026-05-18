import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-precios";

let inst: EnergiaPreciosAgent | null = null;

export class EnergiaPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaPreciosAgent {
    if (!inst) inst = new EnergiaPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía Precios** — tarifas y mercado.";
    const mission =
      "Diseña **pricing de tarifas** (fija, indexada PVPC) y **comparativas de mercado** transparentes y compliant.";
    const fewShot =
      '{"result":"Pricing indexado vs fija + add-ons","score":92,"recommendations":["Simulador anual","Fee servicio claro"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaPreciosAgent(): EnergiaPreciosAgent {
  return EnergiaPreciosAgent.instance();
}

export function resetEnergiaPreciosAgentForTests(): void {
  inst = null;
}
