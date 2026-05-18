import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-email";

let inst: FintechEmailAgent | null = null;

export class FintechEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechEmailAgent {
    if (!inst) inst = new FintechEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech Email** — lifecycle y notificaciones.";
    const mission =
      "Diseña **email lifecycle** y **notificaciones financieras** (estado de cuenta, alertas, reenganche).";
    const fewShot =
      '{"result":"Mapa lifecycle + triggers transaccionales","score":91,"recommendations":["Drip post-KYC","Resumen mensual"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechEmailAgent(): FintechEmailAgent {
  return FintechEmailAgent.instance();
}

export function resetFintechEmailAgentForTests(): void {
  inst = null;
}
