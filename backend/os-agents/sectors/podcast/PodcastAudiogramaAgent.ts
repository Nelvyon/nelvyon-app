import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-audiograma";

let inst: PodcastAudiogramaAgent | null = null;

export class PodcastAudiogramaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastAudiogramaAgent {
    if (!inst) inst = new PodcastAudiogramaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Audiograma** — clip 60s + waveform.";
    const mission =
      "Planifica **audiograma social** (hook 3s, waveform visual, titulares safe 9:16, caption corto).";
    const fewShot =
      '{"result":"Storyboard 60s + copy IG","score":88,"recommendations":["Peak sync","Brand lower third","Loop tail"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastAudiogramaAgent(): PodcastAudiogramaAgent {
  return PodcastAudiogramaAgent.instance();
}

export function resetPodcastAudiogramaAgentForTests(): void {
  inst = null;
}
