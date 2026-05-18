import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-reviews";

export class AudiovisualReviewsAgent {
  private static inst: AudiovisualReviewsAgent | undefined;

  static get instance(): AudiovisualReviewsAgent {
    if (!AudiovisualReviewsAgent.inst) AudiovisualReviewsAgent.inst = new AudiovisualReviewsAgent();
    return AudiovisualReviewsAgent.inst;
  }

  static reset(): void {
    AudiovisualReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual Reviews** — reputación y testimonios.";
    const mission = "Gestiona **reputación y testimonios** con solicitudes, respuestas y casos de éxito.";
    const fewShot =
      '{"result":"Reputación y testimonios audiovisual","score":93,"recommendations":["Testimonios video","Solicitud reseñas"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualReviewsAgent(): AudiovisualReviewsAgent {
  return AudiovisualReviewsAgent.instance;
}

export function resetAudiovisualReviewsAgentForTests(): void {
  AudiovisualReviewsAgent.reset();
}
