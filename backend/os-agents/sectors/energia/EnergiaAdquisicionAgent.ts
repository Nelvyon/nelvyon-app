import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-adquisicion";

let inst: EnergiaAdquisicionAgent | null = null;

export class EnergiaAdquisicionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaAdquisicionAgent {
    if (!inst) inst = new EnergiaAdquisicionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía Adquisición** — residencial y empresa.";
    const mission =
      "Diseña **captación de clientes residencial y empresa** para comercializadora, solar o utility (CPL, bundles, B2B CIF).";
    const fewShot =
      '{"result":"Adquisición hogar + CUPS empresas","score":93,"recommendations":["Lead magnet ahorro kWh","Outbound PYME"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaAdquisicionAgent(): EnergiaAdquisicionAgent {
  return EnergiaAdquisicionAgent.instance();
}

export function resetEnergiaAdquisicionAgentForTests(): void {
  inst = null;
}
