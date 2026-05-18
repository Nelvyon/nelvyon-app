import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-reviews";

export class TelecomReviewsAgent {
  private static inst: TelecomReviewsAgent | undefined;

  static get instance(): TelecomReviewsAgent {
    if (!TelecomReviewsAgent.inst) TelecomReviewsAgent.inst = new TelecomReviewsAgent();
    return TelecomReviewsAgent.inst;
  }

  static reset(): void {
    TelecomReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom Reviews** — reputación y NPS.";
    const mission = "Estructura **reputación online** y **gestión NPS** post-instalación y soporte.";
    const fewShot =
      '{"result":"Reputación + NPS operadora","score":92,"recommendations":["Encuesta D+7","Playbook respuesta"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomReviewsAgent(): TelecomReviewsAgent {
  return TelecomReviewsAgent.instance;
}

export function resetTelecomReviewsAgentForTests(): void {
  TelecomReviewsAgent.reset();
}
