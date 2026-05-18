import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-video";

let inst: MultimodalVideoAgent | null = null;

export class MultimodalVideoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalVideoAgent {
    if (!inst) inst = new MultimodalVideoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Vídeo** — storyboard analítico y rendimiento creativo.";
    const mission =
      "Analiza **vídeo** (beats, hooks, subtítulos, CTA, coherencia audio-visual, cumplimiento plataforma).";
    const fewShot =
      '{"result":"Mapa 0–30s: hook débil en 3s","score":87,"recommendations":["Re-cut 1:1","SRT accesible","Brand intro <2s"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalVideoAgent(): MultimodalVideoAgent {
  return MultimodalVideoAgent.instance();
}

export function resetMultimodalVideoAgentForTests(): void {
  inst = null;
}
