import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-social";

export class AudiovisualSocialAgent {
  private static inst: AudiovisualSocialAgent | undefined;

  static get instance(): AudiovisualSocialAgent {
    if (!AudiovisualSocialAgent.inst) AudiovisualSocialAgent.inst = new AudiovisualSocialAgent();
    return AudiovisualSocialAgent.inst;
  }

  static reset(): void {
    AudiovisualSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual Social** — social video-first.";
    const mission = "Planifica **social media video-first** con reels, shorts y calendario de piezas.";
    const fewShot =
      '{"result":"Social video-first productora","score":92,"recommendations":["Reels semanales","Hooks B2B"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualSocialAgent(): AudiovisualSocialAgent {
  return AudiovisualSocialAgent.instance;
}

export function resetAudiovisualSocialAgentForTests(): void {
  AudiovisualSocialAgent.reset();
}
