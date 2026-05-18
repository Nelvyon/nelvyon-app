import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-audio";

let inst: MultimodalAudioAgent | null = null;

export class MultimodalAudioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalAudioAgent {
    if (!inst) inst = new MultimodalAudioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Audio** — transcripción y análisis accionable.";
    const mission =
      "Describe **pipeline audio** (transcripción, entidades, sentimiento, acciones, privacidad voz).";
    const fewShot =
      '{"result":"Resumen call 12m + 6 action items","score":86,"recommendations":["Marcar PII","Consentimiento grabación","Handoff CRM"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalAudioAgent(): MultimodalAudioAgent {
  return MultimodalAudioAgent.instance();
}

export function resetMultimodalAudioAgentForTests(): void {
  inst = null;
}
