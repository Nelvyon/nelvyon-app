import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-sms";

let inst: VoiceV9SmsAgent | null = null;

export class VoiceV9SmsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9SmsAgent {
    if (!inst) inst = new VoiceV9SmsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 SMS** — seguimiento móvil.";
    const mission =
      "Define **SMS de seguimiento post-conversación** (DLR, acortador firmado, STOP/HELP, throttling por operador).";
    const fewShot =
      '{"result":"Secuencia SMS D+0","score":86,"recommendations":["Sender ID homologado","Sin PII en claro","Link TTL corto"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9SmsAgent(): VoiceV9SmsAgent {
  return VoiceV9SmsAgent.instance();
}

export function resetVoiceV9SmsAgentForTests(): void {
  inst = null;
}
