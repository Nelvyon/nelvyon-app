import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-redaccion";

let inst: VoiceV7RedaccionAgent | null = null;

export class VoiceV7RedaccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7RedaccionAgent {
    if (!inst) inst = new VoiceV7RedaccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Redacción** — PII en texto.";
    const mission =
      "Define **redacción automática de PII** en transcripciones (NER+reglas, re-identificación bloqueada, versionado).";
    const fewShot =
      '{"result":"Pipeline redact post-ASR","score":88,"recommendations":["Lista bloqueada sector","Placeholder estable","QA muestreo"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7RedaccionAgent(): VoiceV7RedaccionAgent {
  return VoiceV7RedaccionAgent.instance();
}

export function resetVoiceV7RedaccionAgentForTests(): void {
  inst = null;
}
