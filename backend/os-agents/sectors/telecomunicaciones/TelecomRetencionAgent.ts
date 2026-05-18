import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-retencion";

export class TelecomRetencionAgent {
  private static inst: TelecomRetencionAgent | undefined;

  static get instance(): TelecomRetencionAgent {
    if (!TelecomRetencionAgent.inst) TelecomRetencionAgent.inst = new TelecomRetencionAgent();
    return TelecomRetencionAgent.inst;
  }

  static reset(): void {
    TelecomRetencionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom Retención** — churn.";
    const mission = "Define **retención y reducción de churn** con win-back, ofertas y journey postventa.";
    const fewShot =
      '{"result":"Retención MVNO + churn reduction","score":92,"recommendations":["Save desk","Oferta win-back"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomRetencionAgent(): TelecomRetencionAgent {
  return TelecomRetencionAgent.instance;
}

export function resetTelecomRetencionAgentForTests(): void {
  TelecomRetencionAgent.reset();
}
