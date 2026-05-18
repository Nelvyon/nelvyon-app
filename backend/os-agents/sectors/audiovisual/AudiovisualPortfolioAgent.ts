import type { ILlmClient } from "../../LlmClient";
import type { AudiovisualInput, AudiovisualOutput } from "./shared";
import { getDefaultAudiovisualLlm, runAudiovisualAgentCore } from "./shared";

const AGENT_ID = "audiovisual-portfolio";

export class AudiovisualPortfolioAgent {
  private static inst: AudiovisualPortfolioAgent | undefined;

  static get instance(): AudiovisualPortfolioAgent {
    if (!AudiovisualPortfolioAgent.inst) AudiovisualPortfolioAgent.inst = new AudiovisualPortfolioAgent();
    return AudiovisualPortfolioAgent.inst;
  }

  static reset(): void {
    AudiovisualPortfolioAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAudiovisualLlm();
  }

  async run(input: AudiovisualInput): Promise<AudiovisualOutput> {
    const eliteRole = "Eres **Audiovisual Portfolio** — portfolio y showreel.";
    const mission = "Diseña **portfolio online** y **showreel con IA** alineados a servicios y targets del negocio.";
    const fewShot =
      '{"result":"Portfolio + showreel IA para productora","score":93,"recommendations":["Showreel 90s","Casos por vertical"]}';
    return runAudiovisualAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAudiovisualPortfolioAgent(): AudiovisualPortfolioAgent {
  return AudiovisualPortfolioAgent.instance;
}

export function resetAudiovisualPortfolioAgentForTests(): void {
  AudiovisualPortfolioAgent.reset();
}
