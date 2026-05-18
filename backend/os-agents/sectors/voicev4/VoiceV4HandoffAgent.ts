import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-handoff";

let inst: VoiceV4HandoffAgent | null = null;

export class VoiceV4HandoffAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4HandoffAgent {
    if (!inst) inst = new VoiceV4HandoffAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 Handoff** — humano con contexto.";
    const mission =
      "Define **handoff inteligente a agente humano** con paquete de contexto (brief, sentimiento, próximo mejor paso).";
    const fewShot =
      '{"result":"Bundle handoff CRM","score":90,"recommendations":["Screen-pop","Prioridad por SLA","No PII en notas libres"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4HandoffAgent(): VoiceV4HandoffAgent {
  return VoiceV4HandoffAgent.instance();
}

export function resetVoiceV4HandoffAgentForTests(): void {
  inst = null;
}
