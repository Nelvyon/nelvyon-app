import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-email";

export class TelecomEmailAgent {
  private static inst: TelecomEmailAgent | undefined;

  static get instance(): TelecomEmailAgent {
    if (!TelecomEmailAgent.inst) TelecomEmailAgent.inst = new TelecomEmailAgent();
    return TelecomEmailAgent.inst;
  }

  static reset(): void {
    TelecomEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom Email** — upsell y renovación.";
    const mission = "Diseña **campañas email de upsell** y **renovación** con lifecycle y compliance.";
    const fewShot =
      '{"result":"Email upsell + renovación contrato ISP","score":90,"recommendations":["D-30 renovación","Upsell fibra"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomEmailAgent(): TelecomEmailAgent {
  return TelecomEmailAgent.instance;
}

export function resetTelecomEmailAgentForTests(): void {
  TelecomEmailAgent.reset();
}
