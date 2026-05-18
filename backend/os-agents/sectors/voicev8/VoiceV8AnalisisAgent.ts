import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-analisis";

let inst: VoiceV8AnalisisAgent | null = null;

export class VoiceV8AnalisisAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8AnalisisAgent {
    if (!inst) inst = new VoiceV8AnalisisAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Análisis** — métricas post-llamada.";
    const mission =
      "Diseña **análisis post-llamada automático** (duración, silencios, interrupciones, ratio habla/escucha, turn-taking).";
    const fewShot =
      '{"result":"Feature vector por llamada","score":88,"recommendations":["VAD calibrado","Overlaps tag","Silencio >4s flag"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8AnalisisAgent(): VoiceV8AnalisisAgent {
  return VoiceV8AnalisisAgent.instance();
}

export function resetVoiceV8AnalisisAgentForTests(): void {
  inst = null;
}
