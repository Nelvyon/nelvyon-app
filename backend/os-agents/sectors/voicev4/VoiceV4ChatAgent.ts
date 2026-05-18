import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-chat";

let inst: VoiceV4ChatAgent | null = null;

export class VoiceV4ChatAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4ChatAgent {
    if (!inst) inst = new VoiceV4ChatAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 Chat** — widget y web.";
    const mission =
      "Diseña **transferencia a chat web con historial** (token de sesión, UI de contexto, reconexión WebSocket).";
    const fewShot =
      '{"result":"Handoff voz→chat widget","score":89,"recommendations":["JWT corto en URL","Mostrar últimos 5 turnos","Typing desde voz"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4ChatAgent(): VoiceV4ChatAgent {
  return VoiceV4ChatAgent.instance();
}

export function resetVoiceV4ChatAgentForTests(): void {
  inst = null;
}
