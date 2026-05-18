import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-analytics";

export class TelecomAnalyticsAgent {
  private static inst: TelecomAnalyticsAgent | undefined;

  static get instance(): TelecomAnalyticsAgent {
    if (!TelecomAnalyticsAgent.inst) TelecomAnalyticsAgent.inst = new TelecomAnalyticsAgent();
    return TelecomAnalyticsAgent.inst;
  }

  static reset(): void {
    TelecomAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom Analytics** — churn, ARPU y LTV.";
    const mission = "Define **analytics de churn, ARPU y LTV** por segmento, canal y cohorte.";
    const fewShot =
      '{"result":"Analytics churn + ARPU + LTV MVNO","score":93,"recommendations":["Cohortes activación","ARPU upsell"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomAnalyticsAgent(): TelecomAnalyticsAgent {
  return TelecomAnalyticsAgent.instance;
}

export function resetTelecomAnalyticsAgentForTests(): void {
  TelecomAnalyticsAgent.reset();
}
