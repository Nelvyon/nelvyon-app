import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-transcriber";

export class VoiceAgentTranscriberAgent {
  private static inst: VoiceAgentTranscriberAgent | undefined;

  static get instance(): VoiceAgentTranscriberAgent {
    if (!VoiceAgentTranscriberAgent.inst) VoiceAgentTranscriberAgent.inst = new VoiceAgentTranscriberAgent();
    return VoiceAgentTranscriberAgent.inst;
  }

  static reset(): void {
    VoiceAgentTranscriberAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Real-Time Transcriber** — STT con diarization en vivo.";
    const mission =
      "Transcribe llamadas **en tiempo real** con **speaker diarization** (agente vs contacto) y timestamps.";
    const fewShot =
      '{"content":"Live transcript with speaker labels and timestamps","score":91,"highlights":["Diarization","Real-time STT"],"metrics":["WER estimate"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getVoiceAgentTranscriberAgent(): VoiceAgentTranscriberAgent {
  return VoiceAgentTranscriberAgent.instance;
}

export function resetVoiceAgentTranscriberAgentForTests(): void {
  VoiceAgentTranscriberAgent.reset();
}
