import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-continuidad";

let inst: VoiceV9ContinuidadAgent | null = null;

export class VoiceV9ContinuidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9ContinuidadAgent {
    if (!inst) inst = new VoiceV9ContinuidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 Continuidad** — contexto omnicanal.";
    const mission =
      "Diseña **continuidad entre voz, WhatsApp, SMS y vídeo** con contexto compartido versionado y resolución de conflictos.";
    const fewShot =
      '{"result":"Estado unificado case_id","score":90,"recommendations":["Snapshot post-voz","Merge idempotente","Preferencia canal"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9ContinuidadAgent(): VoiceV9ContinuidadAgent {
  return VoiceV9ContinuidadAgent.instance();
}

export function resetVoiceV9ContinuidadAgentForTests(): void {
  inst = null;
}
