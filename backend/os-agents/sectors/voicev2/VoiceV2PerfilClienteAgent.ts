import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-perfilcliente";

let inst: VoiceV2PerfilClienteAgent | null = null;

export class VoiceV2PerfilClienteAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2PerfilClienteAgent {
    if (!inst) inst = new VoiceV2PerfilClienteAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Perfil Cliente** — continuidad multillamada.";
    const mission =
      "Construye **perfil dinámico del cliente** a partir de llamadas anteriores (hechos estables vs hipótesis, señales de confianza).";
    const fewShot =
      '{"result":"Perfil voz + CRM merge","score":86,"recommendations":["Score confianza por fuente","Bloquear PII sensible en TTS","Diff por llamada"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2PerfilClienteAgent(): VoiceV2PerfilClienteAgent {
  return VoiceV2PerfilClienteAgent.instance();
}

export function resetVoiceV2PerfilClienteAgentForTests(): void {
  inst = null;
}
