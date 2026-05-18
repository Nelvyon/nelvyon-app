import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-firma";

let inst: VoiceV3FirmaAgent | null = null;

export class VoiceV3FirmaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3FirmaAgent {
    if (!inst) inst = new VoiceV3FirmaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Firma** — eIDAS / mercado.";
    const mission =
      "Define **proceso de firma digital y validación legal** (OTP, evidencia, sellado tiempo, conservación).";
    const fewShot =
      '{"result":"Flujo firma simple avanzada","score":85,"recommendations":["Enlace firmado por SMS","Audit trail","Revocación documentada"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3FirmaAgent(): VoiceV3FirmaAgent {
  return VoiceV3FirmaAgent.instance();
}

export function resetVoiceV3FirmaAgentForTests(): void {
  inst = null;
}
