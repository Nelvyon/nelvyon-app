import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-clientes";

export class AudiovisualClientesAgent {
  private static inst: AudiovisualClientesAgent | undefined;

  static get instance(): AudiovisualClientesAgent {
    if (!AudiovisualClientesAgent.inst) AudiovisualClientesAgent.inst = new AudiovisualClientesAgent();
    return AudiovisualClientesAgent.inst;
  }

  static reset(): void {
    AudiovisualClientesAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual Clientes** — captación corporativa.";
    const mission = "Define **captación de clientes corporativos** con outreach y propuestas alineadas al showreel.";
    const fewShot =
      '{"result":"Captación B2B corporativa audiovisual","score":92,"recommendations":["ICP corporativo","Secuencia outreach"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualClientesAgent(): AudiovisualClientesAgent {
  return AudiovisualClientesAgent.instance;
}

export function resetAudiovisualClientesAgentForTests(): void {
  AudiovisualClientesAgent.reset();
}
