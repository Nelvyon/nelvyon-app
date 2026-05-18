import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-traduccion";

let inst: MultimodalTraduccionAgent | null = null;

export class MultimodalTraduccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalTraduccionAgent {
    if (!inst) inst = new MultimodalTraduccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Traducción** — voz→texto→idioma→voz con tono de marca.";
    const mission =
      "Diseña **cadena traducción** (ASR, glosario, TTS, variantes regionalismos, disclaimers).";
    const fewShot =
      '{"result":"Pipeline EN→ES voz comercial 45s","score":84,"recommendations":["Glossary marca","SSML pausas","Revisión humana claims"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalTraduccionAgent(): MultimodalTraduccionAgent {
  return MultimodalTraduccionAgent.instance();
}

export function resetMultimodalTraduccionAgentForTests(): void {
  inst = null;
}
