import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-precios";

export class TelecomPreciosAgent {
  private static inst: TelecomPreciosAgent | undefined;

  static get instance(): TelecomPreciosAgent {
    if (!TelecomPreciosAgent.inst) TelecomPreciosAgent.inst = new TelecomPreciosAgent();
    return TelecomPreciosAgent.inst;
  }

  static reset(): void {
    TelecomPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom Precios** — tarifas y paquetes.";
    const mission = "Estructura **pricing de tarifas y paquetes** con upsell velocidad, líneas y B2B.";
    const fewShot =
      '{"result":"Pricing fibra + móvil + paquetes convergentes","score":91,"recommendations":["Tiers velocidad","Add-on TV"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomPreciosAgent(): TelecomPreciosAgent {
  return TelecomPreciosAgent.instance;
}

export function resetTelecomPreciosAgentForTests(): void {
  TelecomPreciosAgent.reset();
}
