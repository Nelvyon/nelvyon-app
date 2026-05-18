import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-email";

export class AudiovisualEmailAgent {
  private static inst: AudiovisualEmailAgent | undefined;

  static get instance(): AudiovisualEmailAgent {
    if (!AudiovisualEmailAgent.inst) AudiovisualEmailAgent.inst = new AudiovisualEmailAgent();
    return AudiovisualEmailAgent.inst;
  }

  static reset(): void {
    AudiovisualEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual Email** — campañas audiovisuales.";
    const mission = "Diseña **email marketing** para campañas audiovisuales, nurturing y lanzamientos.";
    const fewShot =
      '{"result":"Email campañas audiovisuales","score":91,"recommendations":["Secuencia lanzamiento","CTA showreel"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualEmailAgent(): AudiovisualEmailAgent {
  return AudiovisualEmailAgent.instance;
}

export function resetAudiovisualEmailAgentForTests(): void {
  AudiovisualEmailAgent.reset();
}
