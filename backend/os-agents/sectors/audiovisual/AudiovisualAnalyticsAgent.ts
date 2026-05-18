import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-analytics";

export class AudiovisualAnalyticsAgent {
  private static inst: AudiovisualAnalyticsAgent | undefined;

  static get instance(): AudiovisualAnalyticsAgent {
    if (!AudiovisualAnalyticsAgent.inst) AudiovisualAnalyticsAgent.inst = new AudiovisualAnalyticsAgent();
    return AudiovisualAnalyticsAgent.inst;
  }

  static reset(): void {
    AudiovisualAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual Analytics** — rendimiento de contenido.";
    const mission = "Analiza **analytics de rendimiento de contenido** (video, social, web) y recomienda mejoras.";
    const fewShot =
      '{"result":"Analytics rendimiento contenido audiovisual","score":92,"recommendations":["Retención video","CTR showreel"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualAnalyticsAgent(): AudiovisualAnalyticsAgent {
  return AudiovisualAnalyticsAgent.instance;
}

export function resetAudiovisualAnalyticsAgentForTests(): void {
  AudiovisualAnalyticsAgent.reset();
}
