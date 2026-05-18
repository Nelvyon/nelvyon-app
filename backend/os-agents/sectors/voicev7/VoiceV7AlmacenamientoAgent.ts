import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-almacenamiento";

let inst: VoiceV7AlmacenamientoAgent | null = null;

export class VoiceV7AlmacenamientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7AlmacenamientoAgent {
    if (!inst) inst = new VoiceV7AlmacenamientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Almacenamiento** — cifrado y marcos legales.";
    const mission =
      "Describe **almacenamiento cifrado GDPR/CCPA/HIPAA** (CMK vs SMK, clasificación de datos, segregación física lógica).";
    const fewShot =
      '{"result":"Capas KMS + bucket policy","score":89,"recommendations":["SSE-KMS por tenant","BAA si HIPAA","Immutability opcional"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7AlmacenamientoAgent(): VoiceV7AlmacenamientoAgent {
  return VoiceV7AlmacenamientoAgent.instance();
}

export function resetVoiceV7AlmacenamientoAgentForTests(): void {
  inst = null;
}
