import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-transcription";

export class DialerTranscriptionAgent {
  private static inst: DialerTranscriptionAgent | undefined;

  static get instance(): DialerTranscriptionAgent {
    if (!DialerTranscriptionAgent.inst) DialerTranscriptionAgent.inst = new DialerTranscriptionAgent();
    return DialerTranscriptionAgent.inst;
  }

  static reset(): void {
    DialerTranscriptionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Transcription** — transcripción en tiempo real.";
    const mission =
      "Transcribe llamadas en **tiempo real** con **<1 s** latencia; extrae **palabras clave** y **sentimiento**.";
    const fewShot =
      '{"content":"Transcription: RT <1 s, keywords, sentimiento","score":93,"highlights":["<1 s RT","Sentimiento"],"metrics":["Transcription latency"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getDialerTranscriptionAgent(): DialerTranscriptionAgent {
  return DialerTranscriptionAgent.instance;
}

export function resetDialerTranscriptionAgentForTests(): void {
  DialerTranscriptionAgent.reset();
}
