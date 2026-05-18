import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-seo";

let inst: EnergiaSEOAgent | null = null;

export class EnergiaSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaSEOAgent {
    if (!inst) inst = new EnergiaSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía SEO** — comparadores y solar.";
    const mission =
      "Diseña **SEO para comparadores de energía** y **contenido solar** (autoconsumo, placas, ROI).";
    const fewShot =
      '{"result":"SEO comparador luz + landing solar","score":92,"recommendations":["FAQ CUPS","Pilar kWh ahorrado"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaSEOAgent(): EnergiaSEOAgent {
  return EnergiaSEOAgent.instance();
}

export function resetEnergiaSEOAgentForTests(): void {
  inst = null;
}
