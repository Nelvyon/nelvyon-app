import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-precios";

export class AudiovisualPreciosAgent {
  private static inst: AudiovisualPreciosAgent | undefined;

  static get instance(): AudiovisualPreciosAgent {
    if (!AudiovisualPreciosAgent.inst) AudiovisualPreciosAgent.inst = new AudiovisualPreciosAgent();
    return AudiovisualPreciosAgent.inst;
  }

  static reset(): void {
    AudiovisualPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual Precios** — paquetes de producción.";
    const mission = "Diseña **estrategia de precios y paquetes** de producción con márgenes y upsells.";
    const fewShot =
      '{"result":"Pricing paquetes producción audiovisual","score":91,"recommendations":["Tiers paquete","Upsell post"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualPreciosAgent(): AudiovisualPreciosAgent {
  return AudiovisualPreciosAgent.instance;
}

export function resetAudiovisualPreciosAgentForTests(): void {
  AudiovisualPreciosAgent.reset();
}
