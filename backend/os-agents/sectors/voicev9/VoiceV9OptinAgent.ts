import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-optin";

let inst: VoiceV9OptinAgent | null = null;

export class VoiceV9OptinAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9OptinAgent {
    if (!inst) inst = new VoiceV9OptinAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 Opt-in** — GDPR por canal.";
    const mission =
      "Describe **opt-in/opt-out GDPR por canal** (registro inmutable, revocación <15 min, impacto en envíos cruzados).";
    const fewShot =
      '{"result":"Matriz consentimiento por canal","score":89,"recommendations":["STOP SMS","Bloqueo WA","DSAR link"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9OptinAgent(): VoiceV9OptinAgent {
  return VoiceV9OptinAgent.instance();
}

export function resetVoiceV9OptinAgentForTests(): void {
  inst = null;
}
