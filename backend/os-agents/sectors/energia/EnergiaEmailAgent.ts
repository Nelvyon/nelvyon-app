import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-email";

let inst: EnergiaEmailAgent | null = null;

export class EnergiaEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaEmailAgent {
    if (!inst) inst = new EnergiaEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía Email** — eficiencia y upsell solar.";
    const mission =
      "Diseña **campañas email** de eficiencia energética y **upsell solar** (secuencias, triggers consumo).";
    const fewShot =
      '{"result":"Secuencia eficiencia + solar pack","score":91,"recommendations":["Trigger pico consumo","Caso ROI 10 años"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaEmailAgent(): EnergiaEmailAgent {
  return EnergiaEmailAgent.instance();
}

export function resetEnergiaEmailAgentForTests(): void {
  inst = null;
}
