import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-transcripcion";

let inst: VoiceV7TranscripcionAgent | null = null;

export class VoiceV7TranscripcionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7TranscripcionAgent {
    if (!inst) inst = new VoiceV7TranscripcionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Transcripción** — Whisper y cadena de custodia.";
    const mission =
      "Define **transcripción legal en tiempo real (Whisper u homólogo)** con verificación, timestamps y segregación por tenant.";
    const fewShot =
      '{"result":"Pipeline ASR legal","score":90,"recommendations":["Modelo EU-only si aplica","Diarización + speaker ID","Hash por segmento"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7TranscripcionAgent(): VoiceV7TranscripcionAgent {
  return VoiceV7TranscripcionAgent.instance();
}

export function resetVoiceV7TranscripcionAgentForTests(): void {
  inst = null;
}
