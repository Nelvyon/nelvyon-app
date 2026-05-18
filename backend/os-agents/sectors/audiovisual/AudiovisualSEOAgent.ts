import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-seo";

export class AudiovisualSEOAgent {
  private static inst: AudiovisualSEOAgent | undefined;

  static get instance(): AudiovisualSEOAgent {
    if (!AudiovisualSEOAgent.inst) AudiovisualSEOAgent.inst = new AudiovisualSEOAgent();
    return AudiovisualSEOAgent.inst;
  }

  static reset(): void {
    AudiovisualSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual SEO** — visibilidad de productoras.";
    const mission = "Optimiza **SEO para productoras y videógrafos** con fichas de servicio y contenido local.";
    const fewShot =
      '{"result":"SEO productora/videógrafo","score":90,"recommendations":["Keywords servicio","Schema local"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualSEOAgent(): AudiovisualSEOAgent {
  return AudiovisualSEOAgent.instance;
}

export function resetAudiovisualSEOAgentForTests(): void {
  AudiovisualSEOAgent.reset();
}
