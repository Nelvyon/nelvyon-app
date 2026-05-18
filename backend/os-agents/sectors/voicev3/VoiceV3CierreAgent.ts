import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-cierre";

let inst: VoiceV3CierreAgent | null = null;

export class VoiceV3CierreAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3CierreAgent {
    if (!inst) inst = new VoiceV3CierreAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Cierre** — ventas asistidas por voz.";
    const mission =
      "Diseña **técnicas de cierre de ventas por voz automatizado** (trial close, asunción positiva, resumen de valor antes del ask).";
    const fewShot =
      '{"result":"Secuencia cierre 60s","score":88,"recommendations":["Confirmar siguiente paso","Evitar presión ilegal","Handoff humano si duda legal"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3CierreAgent(): VoiceV3CierreAgent {
  return VoiceV3CierreAgent.instance();
}

export function resetVoiceV3CierreAgentForTests(): void {
  inst = null;
}
