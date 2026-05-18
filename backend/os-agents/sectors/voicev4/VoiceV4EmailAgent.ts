import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-email";

let inst: VoiceV4EmailAgent | null = null;

export class VoiceV4EmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4EmailAgent {
    if (!inst) inst = new VoiceV4EmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 Email** — cierre asíncrono.";
    const mission =
      "Define **transferencia y resumen automático por email** (thread-id, adjuntos, enlaces firmados temporales).";
    const fewShot =
      '{"result":"Email post-transferencia","score":85,"recommendations":["In-Reply-To ticket","Resumen bullet","PII minimizada"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4EmailAgent(): VoiceV4EmailAgent {
  return VoiceV4EmailAgent.instance();
}

export function resetVoiceV4EmailAgentForTests(): void {
  inst = null;
}
